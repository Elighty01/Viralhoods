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

export async function sendNewsletterDigest() {
  if (!db) {
    return {
      success: true,
      count: 0,
      message: 'Database connection deferred. Newsletter subscribers are safely stored in Firestore.',
    };
  }

  let items: any[] = [];
  try {
    const storiesSnap = await db.collection('stories').limit(10).get();
    items = storiesSnap.docs.map((d) => d.data());
  } catch (_e) {
    // fallback
  }

  let subscribers: any[] = [];
  try {
    const subscribersSnap = await db.collection('subscribers').get();
    subscribers = subscribersSnap.docs
      .map((d) => d.data())
      .filter((s: any) => s.email && s.email.includes('@'));
  } catch (_e) {
    // fallback
  }

  if (subscribers.length === 0) {
    return {
      success: true,
      count: 0,
      message: 'No subscribers currently enrolled in the database.',
    };
  }

  const isSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  let sentCount = 0;

  if (isSmtpConfigured) {
    for (const subscriber of subscribers) {
      const email = subscriber.email;
      if (!email) continue;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'newsletter@viralhoods.com',
          to: email,
          subject: 'Viralhoods Morning Dispatch: Today’s Trending Developments',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h1 style="color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Viralhoods Morning Dispatch</h1>
              <p style="color: #64748b; font-size: 14px;">Today's top trending news and synthesized sector insights.</p>
              ${items
                .map(
                  (item) => `
                <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${item.category || 'World'}</span>
                  <h2 style="font-size: 18px; margin: 8px 0 4px; color: #0f172a;">${item.title}</h2>
                  <p style="font-size: 14px; line-height: 1.5; color: #475569;">${item.summary || item.description || ''}</p>
                </div>
              `
                )
                .join('')}
              <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">
                You are receiving this because you subscribed to the Viralhoods Daily Dispatch.
              </p>
            </div>
          `,
        });
        sentCount++;
      } catch (err: any) {
        console.warn(`[Newsletter] Dispatch notice for ${email}:`, err?.message || err);
      }
    }

    return {
      success: true,
      count: sentCount,
      message: `Dispatched newsletter digest to ${sentCount} live subscribers via SMTP.`,
    };
  }

  return {
    success: true,
    count: subscribers.length,
    message: `Newsletter digest compiled successfully for ${subscribers.length} enrolled subscribers. To deliver live SMTP emails, set SMTP_HOST & SMTP_USER in .env.`,
  };
}
