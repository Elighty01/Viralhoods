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
  if (!db) throw new Error('Database connection not available');
  const stories = await db.collection('stories').orderBy('publishedAt', 'desc').limit(10).get();

  const items = stories.docs.map(doc => doc.data());

  const subscribersSnap = await db.collection('subscribers').get();
  const subscribers = subscribersSnap.docs.map(doc => doc.data());

  for (const subscriber of subscribers) {
    const email = subscriber.email;
    if (!email) continue;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Viralhoods newsletter',
      html: `
        <h1>Viralhoods Latest</h1>
        ${items.map(item => `
          <h2>${item.title}</h2>
          <p>${item.summary || item.description || ''}</p>
          ${item.url ? `<p><a href="${item.url}">Read more</a></p>` : ''}
        `).join('')}
      `,
    });
  }
}
