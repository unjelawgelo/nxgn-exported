import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './pg.js';
import usersRouter from './routes/users.js';
import ministriesRouter from './routes/ministries.js';
import songsRouter from './routes/songs.js';
import playlistsRouter from './routes/playlists.js';
import playlistSongsRouter from './routes/playlistSongs.js';
import joinRequestsRouter from './routes/joinRequests.js';
import availabilityRouter from './routes/availability.js';

const app = express();

// Configure CORS with specific origin and credentials support
const allowedOrigins = [
  'http://localhost:5173',
  'https://nxgn-jrevfam.vercel.app',
  'https://nxgn-api.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Total-Count'
  ]
};

// Apply CORS with the specified options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add headers before the routes are defined
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if the request origin is in the allowed origins
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '1mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  // Redact UUIDs and other sensitive IDs from the URL before logging
  const redactedUrl = req.originalUrl.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[REDACTED_ID]');
  console.log(`[${new Date().toISOString()}] ${req.method} ${redactedUrl}`);
  next();
});

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('select 1 as ok');
    res.json({ ok: true, db: result.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use('/api/users', usersRouter);
app.use('/api/ministries', ministriesRouter);
app.use('/api/songs', songsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/playlist-songs', playlistSongsRouter);
app.use('/api/join-requests', joinRequestsRouter);
app.use('/api/availability', availabilityRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
