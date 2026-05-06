import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, query } from './pg.js';
import usersRouter from './routes/users.js';
import ministriesRouter from './routes/ministries.js';
import songsRouter from './routes/songs.js';
import playlistsRouter from './routes/playlists.js';
import playlistSongsRouter from './routes/playlistSongs.js';
import joinRequestsRouter from './routes/joinRequests.js';
import availabilityRouter from './routes/availability.js';

const app = express();

// Configure CORS with specific origin and credentials support
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins configuration
const allowedOrigins = [

  // Production frontend URLs
  'https://nxgn-jrevfam.vercel.app',  // Your Vercel frontend
  'http://nxgn-jrevfam.vercel.app',   // HTTP version (for testing)
  'https://www.nxgn-jrevfam.vercel.app', // With www
  'http://www.nxgn-jrevfam.vercel.app',  // With www and HTTP
  
  // Development URLs
  'http://localhost:5173',  // Local frontend development
  'http://localhost:4000',  // Local API development
  'http://192.168.*',       // Local network for mobile testing
  'http://10.0.2.2:5173'   // Android emulator
];


const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches any of the allowed patterns
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;

      } else if (pattern.includes('*')) {
        // Handle wildcard patterns like 'http://192.168.*'
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(origin);

      } else if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.warn(`Blocked request from origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    }
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
    'Content-Length',
    'X-Foo',
    'X-Bar',
    'Content-Range',
    'X-Total-Count'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with the specified options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add headers before the routes are defined
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if the request origin matches any of the allowed patterns
  const isAllowed = allowedOrigins.some(pattern => {
    if (typeof pattern === 'string') {
      return origin === pattern;
    } else if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return false;
  });

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin'); // Important for caching
  }
  
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
    const result = await query('select 1 as ok');
    res.json({ ok: true, db: result.rows[0].ok === 1 });
  } catch (e) {
    console.error('Health check failed:', e);
    res.status(500).json({ ok: false, error: e.message || 'Unknown error' });
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
