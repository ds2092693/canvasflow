import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import Groq from 'groq-sdk';

const app = express();
const PORT = process.env.PORT || 3001;

// Model IDs live in env so a provider deprecation is a config change, not a
// code change. Defaults are the currently-supported IDs.
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Only allow the frontend origin(s) to call the proxy. Without this, the
// deployed proxy is an open relay anyone can use to spend our API quota.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

// In dev, Vite runs with strictPort:false and host:true, so the origin can be
// any localhost/127.0.0.1 port. Whitelisting one exact string there produces a
// CORS failure that looks identical to "server is down" in the browser.
const isDev = process.env.NODE_ENV !== 'production';
const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function originAllowed(origin) {
  if (!origin) return true; // non-browser clients send no Origin
  if (allowedOrigins.includes(origin)) return true;
  return isDev && devOrigin.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (originAllowed(origin)) return callback(null, true);
      callback(null, false);
    },
  })
);
app.use(json({ limit: '256kb' }));

// Reject disallowed origins with a readable JSON body instead of letting the
// CORS middleware throw. The browser still blocks it, but the proxy logs tell
// you what happened.
app.use((req, res, next) => {
  if (!originAllowed(req.headers.origin)) {
    console.warn(`Blocked origin: ${req.headers.origin}`);
    return res.status(403).json({
      error: 'Origin not allowed',
      message: `Add ${req.headers.origin} to ALLOWED_ORIGIN in server/.env`,
    });
  }
  next();
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

if (!openai && !groq) {
  console.warn('No AI providers configured — /api/chat will return 503');
}

// --- Simple in-memory rate limiter (sliding window, per IP) -----------------
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    openai: !!openai,
    groq: !!groq,
    openaiModel: OPENAI_MODEL,
    groqModel: GROQ_MODEL,
  });
});

function parseChatRequest(body) {
  const { messages, temperature, maxTokens } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'messages must be a non-empty array' };
  }
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') {
      return { error: 'each message needs a string role and content' };
    }
  }

  return {
    messages,
    temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 2),
    maxTokens: Math.min(Math.max(Number(maxTokens) || 1000, 1), 2000),
  };
}

/** Reduces a provider SDK error to something the client can act on. */
function describe(err) {
  const status = err?.status ?? err?.response?.status;
  const code = err?.code ?? err?.error?.code;
  return {
    status,
    code,
    message: err?.error?.message || err?.message || 'unknown provider error',
  };
}

app.post('/api/chat', rateLimit, async (req, res) => {
  const parsed = parseChatRequest(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { messages, temperature, maxTokens } = parsed;

  if (!openai && !groq) {
    return res.status(503).json({
      error: 'No AI providers configured',
      message: 'Set OPENAI_API_KEY or GROQ_API_KEY in server/.env and restart.',
    });
  }

  let primaryError = null;

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      return res.json({
        provider: 'openai',
        model: OPENAI_MODEL,
        content: completion.choices[0].message.content,
        usage: completion.usage,
      });
    } catch (err) {
      // Fall through to Groq on ANY provider failure, not just 429. A revoked
      // key (401), a retired model (400/404) or an outage (5xx) should all try
      // the backup rather than dead-ending.
      primaryError = describe(err);
      console.warn(
        `OpenAI failed [${primaryError.status} ${primaryError.code}]: ${primaryError.message}`
      );
      if (!groq) {
        return res.status(primaryError.status || 502).json({
          error: 'AI request failed',
          provider: 'openai',
          model: OPENAI_MODEL,
          message: primaryError.message,
          code: primaryError.code,
        });
      }
      console.warn(`Falling back to Groq (${GROQ_MODEL})`);
    }
  }

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return res.json({
      provider: 'groq',
      model: GROQ_MODEL,
      content: completion.choices[0].message.content,
    });
  } catch (err) {
    const e = describe(err);
    console.error(`Groq failed [${e.status} ${e.code}]: ${e.message}`);

    // Surface the real reason. "model_decommissioned" is the one you hit when
    // a provider retires an ID out from under you.
    return res.status(e.status || 502).json({
      error: 'AI request failed',
      provider: 'groq',
      model: GROQ_MODEL,
      message: e.message,
      code: e.code,
      primaryError,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Scriblio AI proxy running on http://localhost:${PORT}`);
  console.log(`  openai: ${openai ? OPENAI_MODEL : 'not configured'}`);
  console.log(`  groq:   ${groq ? GROQ_MODEL : 'not configured'}`);
  console.log(`  allowed origins: ${allowedOrigins.join(', ')}${isDev ? ' (+ any localhost port in dev)' : ''}`);
});