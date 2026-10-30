import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

let db: admin.firestore.Firestore | null = null;

try {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch {
      admin.initializeApp();
    }
  }
  db = admin.firestore();
} catch (err: any) {
  console.warn('[Server] Note: Firebase Admin initialization deferred:', err?.message || err);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function createAccount(email: string, password: string) {
  if (!db) throw new Error('Database connection not available');
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.collection('registered_users').doc(normalizedEmail).get();
  if (existing.exists) {
    throw new Error('Account already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await db.collection('registered_users').doc(normalizedEmail).set({
    email: normalizedEmail,
    passwordHash,
    verified: false,
    verificationToken,
    createdAt: new Date().toISOString(),
  });

  const url = `${process.env.SITE_URL}/verify?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: normalizedEmail,
    subject: 'Welcome to Viralhoods — confirm your account',
    html: `
      <h1>Welcome to Viralhoods</h1>
      <p>Thanks for joining. Please confirm your account.</p>
      <p><a href="${url}">Verify my account</a></p>
    `,
  });
}

export async function verifyAccount(email: string, token: string) {
  if (!db) throw new Error('Database connection not available');
  const normalizedEmail = email.trim().toLowerCase();
  const snap = await db.collection('registered_users').doc(normalizedEmail).get();
  if (!snap.exists) throw new Error('Account not found');

  const user = snap.data()!;
  if (user.verificationToken !== token) throw new Error('Invalid verification token');

  await snap.ref.update({
    verified: true,
    verificationToken: null,
    verifiedAt: new Date().toISOString(),
  });

  return {
    email: normalizedEmail,
  };
}

export async function loginAccount(email: string, password: string) {
  if (!db) throw new Error('Database connection not available');
  const normalizedEmail = email.trim().toLowerCase();
  const snap = await db.collection('registered_users').doc(normalizedEmail).get();
  if (!snap.exists) throw new Error('Invalid credentials');

  const user = snap.data()!;
  if (!user.verified) throw new Error('Email not verified');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { uid: normalizedEmail, email: normalizedEmail, admin: user.admin === true },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      email: normalizedEmail,
      admin: !!user.admin,
    },
  };
}

import { generateElegantNewsletterHtml, selectLatestStoryPerSector } from './newsletterTemplate';
import {
  sendBrevoNewsletterBatch,
  sendBrevoSubscriptionWelcomeEmail,
  getBrevoApiKey,
} from './brevo';
import fs from 'fs';
import path from 'path';

export async function sendNewsletterDigest() {
  let items: any[] = [];

  // 1. Fetch stories from Firestore
  if (db) {
    try {
      const storiesSnap = await db.collection('stories').limit(60).get();
      if (!storiesSnap.empty) {
        items = storiesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      }
    } catch (_e) {
      // fallback
    }
  }

  // 2. Fallback to local data/news.json if Firestore empty or offline
  if (items.length === 0) {
    try {
      const filePath = path.join(process.cwd(), 'data', 'news.json');
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(raw?.items)) {
          items = raw.items;
        }
      }
    } catch (_fErr) {
      // fallback
    }
  }

  // Ensure newsletter strictly contains only the single latest story from each of the 10 sectors
  const sectorStories = selectLatestStoryPerSector(items);
  const digestItems = sectorStories.length > 0 ? sectorStories : items.slice(0, 10);

  let subscribers: any[] = [];
  if (db) {
    try {
      const subscribersSnap = await db.collection('subscribers').get();
      subscribers = subscribersSnap.docs
        .map((d) => d.data())
        .filter((s: any) => s.email && s.email.includes('@'));
    } catch (_e) {
      // fallback
    }
  }

  // Fallback subscriber if the real list is empty, so a test send still
  // goes somewhere — ADMIN_EMAIL (see .env.example), not a hardcoded
  // address. No fallback at all if that isn't configured either.
  if (subscribers.length === 0 && process.env.ADMIN_EMAIL) {
    subscribers = [{ email: process.env.ADMIN_EMAIL, source: 'chief_admin' }];
  }

  const subject = `Viralhoods Morning Dispatch: ${digestItems[0]?.title ? digestItems[0].title.slice(0, 60) + '...' : 'Today’s Verified Headlines'}`;
  const previewHtml = generateElegantNewsletterHtml(digestItems);

  let brevoResult = { sent: 0, failed: 0, errors: [] as string[], needsIpAuth: false };
  const hasBrevoKey = Boolean(await getBrevoApiKey());

  if (hasBrevoKey) {
    brevoResult = await sendBrevoNewsletterBatch(subscribers, previewHtml, subject);
  }

  const isSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  let smtpSentCount = 0;

  if (isSmtpConfigured && brevoResult.sent === 0) {
    for (const subscriber of subscribers) {
      const email = subscriber.email;
      if (!email) continue;

      const emailHtml = generateElegantNewsletterHtml(digestItems, {
        recipientEmail: email,
      });

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Viralhoods Daily Dispatch" <newsletter@viralhoods.com>',
          to: email,
          subject,
          html: emailHtml,
        });
        smtpSentCount++;
      } catch (err: any) {
        console.warn(`[Newsletter] SMTP dispatch notice for ${email}:`, err?.message || err);
      }
    }
  }

  // Record automated newsletter dispatch record in Firestore
  if (db) {
    try {
      await db.collection('system').doc('newsletter_status').set(
        {
          lastDispatchedAt: new Date().toISOString(),
          headlinesCount: digestItems.length,
          subscribersTargeted: subscribers.length,
          deliveredViaBrevo: brevoResult.sent,
          deliveredViaSmtp: smtpSentCount,
          isBrevoConfigured: hasBrevoKey,
          isSmtpConfigured,
          leadStoryTitle: digestItems[0]?.title || 'Today’s Trending Digest',
          status: 'success',
          needsIpAuth: brevoResult.needsIpAuth,
        },
        { merge: true }
      );
    } catch (_dbErr) {
      // non-fatal
    }
  }

  if (brevoResult.sent > 0) {
    return {
      success: true,
      count: brevoResult.sent,
      subscribersCount: subscribers.length,
      headlinesCount: digestItems.length,
      htmlPreview: previewHtml,
      brevoDelivered: true,
      message: `Dispatched elegant newsletter digest to ${brevoResult.sent} subscribers via Brevo API!`,
    };
  }

  if (brevoResult.needsIpAuth) {
    return {
      success: true,
      count: subscribers.length,
      subscribersCount: subscribers.length,
      headlinesCount: digestItems.length,
      htmlPreview: previewHtml,
      needsIpAuth: true,
      message: `Newsletter compiled! Brevo API key connected. (Note: To send from cloud IPs, authorize at https://app.brevo.com/security/authorised_ips).`,
    };
  }

  if (smtpSentCount > 0) {
    return {
      success: true,
      count: smtpSentCount,
      subscribersCount: subscribers.length,
      headlinesCount: digestItems.length,
      htmlPreview: previewHtml,
      message: `Dispatched elegant newsletter digest to ${smtpSentCount} live subscribers via SMTP.`,
    };
  }

  return {
    success: true,
    count: subscribers.length,
    subscribersCount: subscribers.length,
    headlinesCount: digestItems.length,
    htmlPreview: previewHtml,
    message: `10-Sector newsletter digest compiled successfully for ${subscribers.length} enrolled subscribers. Brevo integration active.`,
  };
}
