import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. Multi-turn Gemini Chatbot with Search Grounding
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { messages, useSearch = true, model = 'gemini-3.8-flash' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const systemInstruction =
      'You are the Viralhoods AI Intelligence Assistant. You provide verified, non-plagiarized, original syntheses of global news, trending sectors, and investigative inquiries across politics, science, tech, health, finance, and culture. Answer with crisp, authoritative clarity and executive takeaways. Never redirect readers to external link farms.';

    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }],
    }));

    const config: any = {
      systemInstruction,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const reply = response.text || '';
    const searchGrounding = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    res.json({
      text: reply,
      searchGrounding,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error?.message || 'Chat generation failed' });
  }
});

// 2. Google Search Grounding for News Verification
app.post('/api/gemini/search-grounding', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Perform an authoritative, real-time news search and provide a verified 3-paragraph executive briefing on: ${query}. Include key takeaways.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    res.json({
      text: response.text || '',
      grounding: response.candidates?.[0]?.groundingMetadata || null,
    });
  } catch (error: any) {
    console.error('Search grounding error:', error);
    res.status(500).json({ error: error?.message || 'Search grounding failed' });
  }
});

// 3. Google Maps Grounding
app.post('/api/gemini/maps-grounding', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Location query is required.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Provide verified geographic and institutional context using Maps grounding for: ${query}.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    res.json({
      text: response.text || '',
      grounding: response.candidates?.[0]?.groundingMetadata || null,
    });
  } catch (error: any) {
    console.error('Maps grounding error:', error);
    res.status(500).json({ error: error?.message || 'Maps grounding failed' });
  }
});

// 4. Audio Transcription with gemini-3.5-transcribe
app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 is required.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        },
        'Transcribe this audio recording verbatim in plain text with high accuracy.',
      ],
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error?.message || 'Audio transcription failed' });
  }
});

// 5. Image Creation with gemini-nano-banana-2.1
app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '16:9' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const response = await ai.models.generateImages({
      model: 'gemini-nano-banana-2.1',
      prompt: `Editorial news illustration for Viralhoods: ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio,
      },
    });

    const image = response.generatedImages?.[0]?.image?.imageBytes;
    if (!image) {
      throw new Error('No image was returned by the model.');
    }

    res.json({ imageBase64: image });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error?.message || 'Image generation failed' });
  }
});

// 6. Video Generation with Veo 3 (veo-3.1-fast-generate-preview)
app.post('/api/gemini/generate-video', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '16:9', imageBase64 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const params: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic news broadcast clip: ${prompt}`,
      config: {
        aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      },
    };

    if (imageBase64) {
      params.image = {
        imageBytes: imageBase64,
      };
    }

    const response = await ai.models.generateVideos(params);
    res.json({ videoUri: response?.generatedVideos?.[0]?.video?.uri || '' });
  } catch (error: any) {
    console.error('Video generation error:', error);
    res.status(500).json({ error: error?.message || 'Video generation failed' });
  }
});

// 7. Music Generation with Lyria (lyria-3-clip-preview)
app.post('/api/gemini/generate-music', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const response = await ai.models.generateContent({
      model: 'lyria-3-clip-preview',
      contents: `Short audio podcast theme clip: ${prompt}`,
    });

    res.json({ audio: response.text || '' });
  } catch (error: any) {
    console.error('Music generation error:', error);
    res.status(500).json({ error: error?.message || 'Music generation failed' });
  }
});

// Mount Vite in dev mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Viralhoods Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
