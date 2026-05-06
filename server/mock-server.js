import express from 'express';
import cors from 'cors';

const app = express();

// Simple CORS configuration for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.*'],
  credentials: true
}));

app.use(express.json());

// Mock data
const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'sub_admin',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    status: 'active',
    pincode: '1234'
  },
  {
    id: 'user-2', 
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'member',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    status: 'active',
    pincode: '5678'
  }
];

const mockMinistries = [
  {
    id: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    name: 'Main Church Ministry',
    passcode: 'church123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ministry-2',
    name: 'Youth Ministry',
    passcode: 'youth456',
    createdAt: new Date().toISOString()
  }
];

const mockSongs = [
  {
    id: 'song-1',
    title: 'Amazing Grace',
    category: 'Hymn',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    createdAt: new Date().toISOString()
  },
  {
    id: 'song-2',
    title: 'How Great Thou Art',
    category: 'Hymn',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    createdAt: new Date().toISOString()
  },
  {
    id: 'song-3',
    title: 'Contemporary Worship Song',
    category: 'Contemporary',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    createdAt: new Date().toISOString()
  }
];

const mockPlaylists = [
  {
    id: 'playlist-1',
    name: 'Sunday Service',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    createdAt: new Date().toISOString()
  },
  {
    id: 'playlist-2',
    name: 'Youth Night',
    ministryId: '5c1b931c-3bcb-421d-8fd2-56a37a2e2283',
    createdAt: new Date().toISOString()
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, db: true });
});

// Users endpoints
app.get('/api/users', (req, res) => {
  const { ministryId } = req.query;
  let users = mockUsers;
  if (ministryId) {
    users = users.filter(user => user.ministryId === ministryId);
  }
  res.json(users);
});

app.get('/api/users/by-pincode/:pincode', (req, res) => {
  const { pincode } = req.params;
  const user = mockUsers.find(u => u.pincode === pincode);
  res.json(user || null);
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = mockUsers.find(u => u.id === id);
  res.json(user || null);
});

// Ministries endpoints
app.get('/api/ministries', (req, res) => {
  res.json(mockMinistries);
});

app.get('/api/ministries/by-passcode/:passcode', (req, res) => {
  const { passcode } = req.params;
  const ministry = mockMinistries.find(m => m.passcode === passcode);
  res.json(ministry || null);
});

app.get('/api/ministries/:id', (req, res) => {
  const { id } = req.params;
  const ministry = mockMinistries.find(m => m.id === id);
  res.json(ministry || null);
});

// Songs endpoints
app.get('/api/songs', (req, res) => {
  const { ministryId, category } = req.query;
  let songs = mockSongs;
  if (ministryId) {
    songs = songs.filter(song => song.ministryId === ministryId);
  }
  if (category) {
    songs = songs.filter(song => song.category === category);
  }
  res.json(songs);
});

// Playlists endpoints
app.get('/api/playlists', (req, res) => {
  const { ministryId } = req.query;
  let playlists = mockPlaylists;
  if (ministryId) {
    playlists = playlists.filter(playlist => playlist.ministryId === ministryId);
  }
  res.json(playlists);
});

// Playlist songs endpoints
app.get('/api/playlist-songs', (req, res) => {
  const { playlistId } = req.query;
  // Return mock songs for the playlist
  res.json(mockSongs.slice(0, 2));
});

// Add request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
  console.log('📊 Available endpoints:');
  console.log('  GET /health');
  console.log('  GET /api/users');
  console.log('  GET /api/ministries');
  console.log('  GET /api/songs');
  console.log('  GET /api/playlists');
  console.log('  GET /api/playlist-songs');
});
