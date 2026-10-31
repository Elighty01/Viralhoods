/**
 * Brevo (formerly Sendinblue) Transactional Email & Newsletter Service
 * Handles transactional emails, subscription confirmation messages,
 * and daily 10-sector newsletter dispatches.
 */

export interface BrevoSender {
  name: string;
  email: string;
}

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface SendBrevoEmailParams {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  sender?: BrevoSender;
  replyTo?: BrevoSender;
}

export interface BrevoResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  needsIpAuth?: boolean;
}

import admin from 'firebase-admin';

// Base URL for the Brevo (Sendinblue) v3 REST API. Every call below builds
// its endpoint off this — it was previously referenced without ever being
// declared, which made sendBrevoEmail/syncBrevoContact throw at call time.
const BREVO_API_URL = 'https://api.brevo.com/v3';

let db: admin.firestore.Firestore | null = null;
try {
  if (admin.apps.length > 0) {
    db = admin.firestore();
  }
} catch {
  // deferred
}

let cachedBrevoKey = '';

export async function getBrevoApiKey(): Promise<string> {
  if (process.env.BREVO_API_KEY) {
    return process.env.BREVO_API_KEY.trim();
  }
  if (cachedBrevoKey) {
    return cachedBrevoKey;
  }
  if (!db && admin.apps.length > 0) {
    try {
      db = admin.firestore();
    } catch {
      // ignore
    }
  }
  if (db) {
    try {
      const snap = await db.collection('system').doc('brevo_config').get();
      if (snap.exists && snap.data()?.apiKey) {
        cachedBrevoKey = String(snap.data()?.apiKey || '').trim();
        return cachedBrevoKey;
      }
    } catch {
      // non-fatal
    }
  }
  return '';
}

export function setCachedBrevoKey(key: string) {
  cachedBrevoKey = key.trim();
}

export function getDefaultSender(): BrevoSender {
  return {
    name: process.env.BREVO_SENDER_NAME || 'Viralhoods Daily Dispatch',
    // No personal-address fallback here on purpose — set BREVO_SENDER_EMAIL
    // in your .env to whichever address you actually want outgoing mail to
    // come from. Note that whatever address you do configure will be
    // visible to every recipient regardless (it's the From: header), so
    // this is really a "pick a sending identity" setting, not a secrecy
    // one — a dedicated address (e.g. hello@yourdomain.com) verified in
    // Brevo is generally a better choice than a personal inbox either way.
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@viralhoods.com',
  };
}

/**
 * Sends a transactional email using the Brevo v3 REST API.
 */
export async function sendBrevoEmail(params: SendBrevoEmailParams): Promise<BrevoResponse> {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) {
    return { success: false, error: 'Brevo API key is not configured.' };
  }

  const sender = params.sender || getDefaultSender();

  try {
    const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(4000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        success: true,
        messageId: data.messageId || 'sent',
      };
    }

    const errorMsg = data.message || `Brevo API error (Status ${res.status})`;
    const needsIpAuth =
      typeof errorMsg === 'string' &&
      (errorMsg.toLowerCase().includes('unrecognised ip') ||
        errorMsg.toLowerCase().includes('authorised_ips'));

    console.warn('[Brevo API]', errorMsg);

    return {
      success: false,
      error: errorMsg,
      needsIpAuth,
    };
  } catch (err: any) {
    console.error('[Brevo Service Exception]:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network error communicating with Brevo',
    };
  }
}

/**
 * Creates or updates a subscriber contact in Brevo's contact list.
 */
export async function syncBrevoContact(email: string): Promise<boolean> {
  const apiKey = await getBrevoApiKey();
  if (!apiKey || !email) return false;

  try {
    const res = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        updateEnabled: true,
      }),
    });

    return res.ok;
  } catch (_e) {
    return false;
  }
}

/**
 * Marks a contact as unsubscribed/blacklisted in Brevo so they stop
 * receiving any Brevo-side campaigns too (not just our own transactional
 * sends). Best-effort: a missing API key or network failure is treated as a
 * non-fatal no-op by the caller, since the Firestore subscriber record is
 * the primary source of truth for "are they still subscribed".
 */
export async function setBrevoContactUnsubscribed(email: string): Promise<boolean> {
  const apiKey = await getBrevoApiKey();
  if (!apiKey || !email) return false;

  try {
    const res = await fetch(`${BREVO_API_URL}/contacts/${encodeURIComponent(email.trim().toLowerCase())}`, {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ emailBlacklisted: true }),
    });

    return res.ok;
  } catch (_e) {
    return false;
  }
}

/**
 * Generates an elegant publication-grade welcome email confirming a new subscription.
 */
/** Minimal HTML-escaping for untrusted text (a subscriber-submitted email
 * address) before it's embedded in a raw HTML email body — kept in sync
 * with the identical function in src/utils/newsletterTemplate.ts. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateSubscriptionWelcomeHtml(email: string, siteUrl: string = 'https://viralhoods.com'): string {
  const cleanSiteUrl = siteUrl.replace(/\/$/, '');
  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Viralhoods Morning Dispatch</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);">
          
          <!-- Gold Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #0284c7 0%, #d97706 50%, #10b981 100%);"></td>
          </tr>

          <!-- Deep Navy Masthead -->
          <tr>
            <td style="background-color: #090d16; padding: 32px 30px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(2, 132, 199, 0.2); border: 1px solid rgba(2, 132, 199, 0.4); padding: 4px 12px; border-radius: 20px; color: #38bdf8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
                SUBSCRIPTION CONFIRMED
              </span>
              <h1 style="margin: 0 0 6px; font-size: 30px; font-weight: 900; letter-spacing: 0.12em; color: #ffffff; font-family: 'Georgia', serif; text-transform: uppercase;">
                VIRALHOODS
              </h1>
              <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.04em;">
                10-SECTOR EXECUTIVE BRIEFING &bull; ONE LATEST STORY PER SECTOR
              </p>
            </td>
          </tr>

          <!-- Welcome Body -->
          <tr>
            <td style="padding: 32px 30px 24px; color: #334155; line-height: 1.6;">
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Georgia', serif;">
                You are now subscribed to the Daily Morning Dispatch.
              </h2>
              <p style="margin: 0 0 16px; font-size: 15px; color: #475569;">
                Thank you for subscribing with <strong>${escapeHtml(email)}</strong>. Every morning, you will receive our executive newsletter featuring <strong>strictly the single latest verified development</strong> from each of our 10 monitored sectors:
              </p>

              <!-- Sector Badges -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">
                      Your Daily 10-Sector Coverage:
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.8;">
                      🌍 World &bull; 🏛️ Politics &bull; 📈 Finance &bull; 🏥 Health &bull; 🎬 Entertainment<br>
                      🔬 Research &bull; 🧬 Science &bull; 🤖 AI &bull; 💻 Tech &bull; ⚽ Sports
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">
                <strong>Next automated delivery:</strong> Tomorrow at 12:00 AM UTC right after the daily global news scraping routine completes.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0284c7; border-radius: 6px; text-align: center;">
                    <a href="${cleanSiteUrl}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none;">
                      Explore Live News Feed &rarr;
                    </a>
                  </td>
                  <td style="padding-left: 12px;">
                    <a href="${cleanSiteUrl}/#newsletter" style="display: inline-block; padding: 12px 20px; font-size: 14px; font-weight: 700; color: #0284c7; background-color: #e0f2fe; border-radius: 6px; text-decoration: none;">
                      Read Today's Edition &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #090d16; padding: 24px 30px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.08em;">
                VIRALHOODS
              </p>
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                You received this confirmation because you enrolled at <a href="${cleanSiteUrl}" style="color: #38bdf8; text-decoration: none;">Viralhoods.com</a>.<br>
                <a href="${cleanSiteUrl}/#unsubscribe?email=${encodeURIComponent(email)}" style="color: #38bdf8; text-decoration: none;">Unsubscribe</a> at any time &mdash; one click, no account needed.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the welcome/confirmation email to a new subscriber using Brevo.
 */
export async function sendBrevoSubscriptionWelcomeEmail(
  subscriberEmail: string,
  siteUrl?: string
): Promise<BrevoResponse> {
  const htmlContent = generateSubscriptionWelcomeHtml(subscriberEmail, siteUrl);

  // Sync to Brevo contact list in background
  syncBrevoContact(subscriberEmail).catch(() => {});

  return sendBrevoEmail({
    to: [{ email: subscriberEmail }],
    subject: 'Welcome to Viralhoods Morning Dispatch — Subscription Confirmed',
    htmlContent,
  });
}

/**
 * Sends a newsletter edition to multiple subscribers via Brevo transactional email.
 */
export async function sendBrevoNewsletterBatch(
  subscribers: Array<{ email: string }>,
  htmlContent: string,
  subject: string
): Promise<{ sent: number; failed: number; errors: string[]; needsIpAuth: boolean }> {
  let sent = 0;
  let failed = 0;
  let needsIpAuth = false;
  const errors: string[] = [];

  for (const sub of subscribers) {
    if (!sub.email || !sub.email.includes('@')) continue;

    const res = await sendBrevoEmail({
      to: [{ email: sub.email }],
      subject,
      htmlContent,
    });

    if (res.success) {
      sent++;
    } else {
      failed++;
      if (res.needsIpAuth) needsIpAuth = true;
      if (res.error && !errors.includes(res.error)) {
        errors.push(res.error);
      }
    }
  }

  return { sent, failed, errors, needsIpAuth };
}
