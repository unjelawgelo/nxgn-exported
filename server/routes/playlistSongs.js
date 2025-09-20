import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Add a song to playlist (assign next position)
router.post('/', async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    if (!playlistId || !songId) return res.status(400).json({ error: 'playlistId and songId are required' });
    const id = uuidv4();
    const { rows: countRows } = await query('select count(*)::int as cnt from playlist_songs where playlist_id=$1', [playlistId]);
    const position = countRows[0]?.cnt ?? 0;
    const now = new Date().toISOString();
    await query(
      `insert into playlist_songs (id, playlist_id, song_id, position, added_at) values ($1,$2,$3,$4,$5)`,
      [id, playlistId, songId, position, now]
    );
    const { rows } = await query('select * from playlist_songs where id=$1', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove a song from playlist by composite
router.delete('/', async (req, res) => {
  try {
    const { playlistId, songId } = req.query;
    if (!playlistId || !songId) return res.status(400).json({ error: 'playlistId and songId are required' });
    const { rows } = await query('select id from playlist_songs where playlist_id=$1 and song_id=$2 limit 1', [playlistId, songId]);
    if (!rows[0]) return res.status(204).end();
    await query('delete from playlist_songs where id=$1', [rows[0].id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get songs (full song objects) for a playlist
router.get('/', async (req, res) => {
  try {
    const { playlistId } = req.query;
    if (!playlistId) return res.status(400).json({ error: 'playlistId is required' });
    const { rows } = await query(
      `select s.* from playlist_songs ps
       join songs s on s.id = ps.song_id
       where ps.playlist_id = $1
       order by ps.position asc`,
      [playlistId]
    );
    res.json(rows.map(songToCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toCamel(row){
  if (!row) return row;
  return {
    id: row.id,
    playlistId: row.playlist_id,
    songId: row.song_id,
    position: row.position,
    transition: row.transition,
    addedAt: row.added_at?.toISOString?.() ?? row.added_at,
  };
}

function songToCamel(row){
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    lyrics: row.lyrics,
    chords: row.chords,
    category: row.category,
    ministryId: row.ministry_id,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export default router;
