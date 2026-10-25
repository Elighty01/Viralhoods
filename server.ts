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
import { GoogleGenAI } from '@google/genai';

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

// ---------------------------------------------------------------------------
// AI Assistant & Media Studio API Endpoints
// ---------------------------------------------------------------------------

app.post('/api/ai/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Not working at the moment, try back later' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { messages = [], model = 'gemini-3.8-flash', useSearch = true, activeSector } = req.body || {};

    const preamble = `You are the Viralhoods AI Intelligence Assistant. Be concise, factual, and helpful. Current sector: ${activeSector || 'All'}.`;
    const contents: any[] = [
      { role: 'user', parts: [{ text: preamble }] },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
    ];

    let text = '';
    let searchGrounding: string[] = [];
    if (useSearch) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { tools: [{ googleSearch: {} }] } as any,
        });
        text = response.text || '';
        const chunks = (response as any)?.candidates?.[0]?.groundingMetadata?.webSearchQueries;
        if (Array.isArray(chunks)) searchGrounding = chunks;
      } catch {
        // fallback to standard generation
      }
    }

    if (!text) {
      const response = await ai.models.generateContent({
        model,
        contents,
      });
      text = response.text || '';
    }

    return res.json({ text, searchGrounding });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  }
});

app.post('/api/ai/image', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Not working at the moment, try back later' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Not working at the moment, try back later' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
      } as any,
    });
    const parts = (response as any)?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (imagePart) {
      return res.json({ imageBase64: imagePart.inlineData.data });
    }
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  } catch (err) {
    console.error('Image generation error:', err);
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  }
});

app.post('/api/ai/video', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Not working at the moment, try back later' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { prompt, aspectRatio = '16:9', imageBase64 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Not working at the moment, try back later' });

    let videoBase64: string | null = null;
    if ((ai as any).interactions && typeof (ai as any).interactions.create === 'function') {
      const inputPayload = imageBase64
        ? [
            { type: 'image', mime_type: 'image/png', data: imageBase64 },
            { type: 'text', text: prompt },
          ]
        : prompt;

      const interaction = await (ai as any).interactions.create(
        {
          model: 'gemini-omni-1.1-flash',
          input: inputPayload,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
          },
        },
        { timeout: 300000 }
      );
      const videoPart = interaction?.output_video;
      if (videoPart?.data) {
        videoBase64 = videoPart.data;
      }
    }

    if (videoBase64) {
      return res.json({ videoBase64 });
    }
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  } catch (err) {
    console.error('Video generation error:', err);
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  }
});

app.post('/api/ai/music', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Not working at the moment, try back later' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Not working at the moment, try back later' });

    const response = await ai.models.generateContent({
      model: 'lyria-3-clip-preview',
      contents: prompt,
    });
    return res.json({ text: response.text || 'Audio track generated.' });
  } catch (err) {
    console.error('Music generation error:', err);
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  }
});

app.post('/api/ai/maps', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Not working at the moment, try back later' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Not working at the moment, try back later' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Provide an accurate, concise geographical and institutional report on: ${query}`,
    });
    return res.json({ text: response.text || '' });
  } catch (err) {
    console.error('Maps query error:', err);
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
  }
});

app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Not working at the moment, try back later' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { audioBase64, mimeType = 'audio/webm' } = req.body || {};
    if (!audioBase64) return res.status(400).json({ error: 'Not working at the moment, try back later' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this audio clip to plain text. Reply with only the transcription, nothing else.' },
            { inlineData: { mimeType, data: audioBase64 } },
          ],
        },
      ],
    });
    return res.json({ text: (response.text || '').trim() });
  } catch (err) {
    console.error('Transcription error:', err);
    return res.status(500).json({ error: 'Not working at the moment, try back later' });
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
