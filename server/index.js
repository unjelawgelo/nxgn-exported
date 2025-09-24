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

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
