// -----------------------------------------------------------------------
// OPTIONAL standalone API server — NOT part of the default deployment.
//
// Viralhoods is deployed as a static site (GitHub Pages) backed by Firebase
// (Auth, Firestore, and the Cloud Functions in functions/src/index.ts). That
// combination needs no server to stay running, which is what GitHub Pages
// hosting requires. This file is a real, working Express + bcrypt + JWT
// backend, but nothing in the deployed frontend calls it — the app uses
// Firebase Auth directly instead (see src/firebase.ts, src/components/
// AuthModal.tsx). Run this only if you choose to self-host it separately
// (e.g. on Render/Railway/Fly/a VPS) and update the frontend to call it.
// -----------------------------------------------------------------------
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  createAccount,
  loginAccount,
  verifyAccount,
  sendNewsletterDigest,
} from './server/auth';
import { runScraper } from './scripts/scrape';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  // Allow iframe embedding and Vite dev HMR/inline scripts
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; base-uri 'self'; object-src 'none';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

function rateLimit(maxPerMinute: number) {
  const requests: Record<string, number[]> = {};

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const timestamps = requests[ip] || [];
    const filtered = timestamps.filter((ts) => now - ts < 60_000);

    if (filtered.length >= maxPerMinute) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    filtered.push(now);
    requests[ip] = filtered;
    next();
  };
}

app.use('/api/auth', rateLimit(10));
app.use('/api/newsletter', rateLimit(5));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (8+ chars) required' });
    }

    await createAccount(email, password);
    return res.json({ ok: true, message: 'Verification email sent' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const { email, token } = req.query as any;

    if (!email || !token) {
      return res.status(400).json({ error: 'Missing email or token' });
    }

    await verifyAccount(String(email), String(token));
    return res.redirect(`${process.env.SITE_URL}/login?verified=1`);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await loginAccount(email, password);

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ ok: true, user: result.user });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Login failed' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('auth_token');
  return res.json({ ok: true });
});

app.post('/api/newsletter/send', async (req, res) => {
  try {
    const adminHeader = req.headers['x-admin-key'];

    if (adminHeader !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await sendNewsletterDigest();
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Newsletter failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/scraper/proxy', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '');
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).send('Invalid url parameter');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ViralhoodsBot/2.4',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      return res.status(resp.status).send(`Upstream feed returned status ${resp.status}`);
    }
    const text = await resp.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.send(text);
  } catch (err: any) {
    return res.status(500).send(err?.message || 'Proxy error');
  }
});

app.post('/api/scraper/trigger', async (req, res) => {
  try {
    const category = req.body?.category;
    const result = await runScraper(category);
    return res.json({
      ok: true,
      count: result.count,
      pruned: result.pruned,
      total: result.total,
    });
  } catch (err: any) {
    console.error('Scraper trigger error:', err);
    return res.status(500).json({ error: err.message || 'Scraper failed' });
  }
});

const port = Number(process.env.PORT || 3000);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Viralhoods listening on http://0.0.0.0:${port}`);
});
