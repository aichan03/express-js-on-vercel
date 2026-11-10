import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const app = express();
dotenv.config();

const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false); // no CORS headers, browser blocks it
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days, in seconds
const SESSION_TTL = 60 * 5; // 5 mins, in seconds

const isProd = Boolean(process.env.VERCEL);

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', // localhost:3000 <-> localhost:5173 is same-site
  maxAge: SESSION_TTL * 1000,
  path: '/',
};

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function requireAuth(req, res, next) {
  const { sid } = req.cookies;
  if (!sid) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = await redis.get(`session:${sid}`);
  if (!session) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  req.session = session; // Upstash auto-parses JSON
  req.sid = sid;
  next();
}

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/redis-connected', async (req, res) => {
  const count = await redis.incr('visits');
  res.json({ count });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== 'admin@gmail.com' || password !== 'password') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sid = crypto.randomUUID();
    await redis.set(`session:${sid}`, { userId: 1, email }, { ex: SESSION_TTL });

    res.cookie('sid', sid, cookieOptions);
    return res.json({ success: true, user: sid });
  } catch (err) {
    console.error('login failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/me', requireAuth, (req, res) => {
  res.json({ user: 'admin', id: 1 });
});

app.post('/logout', requireAuth, async (req, res) => {
  await redis.del(`session:${req.sid}`);
  res.clearCookie('sid', { ...cookieOptions, maxAge: undefined });
  res.json({ success: true });
});

if (!process.env.VERCEL) {
  app.listen(process.env.SERVER_PORT, () => console.info('Running on http://localhost:3000'));
}

export default app;
