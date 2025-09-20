import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create song
router.post('/', async (req, res) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { title, lyrics, chords, category, ministryId, createdBy } = req.body;
    await query(
      `insert into songs (id, title, lyrics, chords, category, ministry_id, created_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, title, lyrics, chords, category, ministryId, createdBy, now, now]
    );
    const { rows } = await query('select * from songs where id=$1', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List by ministry (and optional category)
router.get('/', async (req, res) => {
  try {
    const { ministryId, category } = req.query;
    if (!ministryId) return res.status(400).json({ error: 'ministryId is required' });
    const params = [ministryId];
    let sql = 'select * from songs where ministry_id=$1';
    if (category) { sql += ' and category=$2'; params.push(category); }
    sql += ' order by title asc';
    const { rows } = await query(sql, params);
    res.json(rows.map(toCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search by query (client-side does this now, but provide server filtering too)
router.get('/search', async (req, res) => {
  try {
    const { ministryId, q, category } = req.query;
    if (!ministryId) return res.status(400).json({ error: 'ministryId is required' });
    const params = [ministryId];
    let sql = 'select * from songs where ministry_id=$1';
    if (category) { params.push(category); sql += ` and category=$${params.length}`; }
    if (q && String(q).trim()) {
      const like = `%${String(q).toLowerCase()}%`;
      params.push(like, like, like);
      sql += ` and (lower(title) like $${params.length-2} or lower(lyrics) like $${params.length-1} or lower(chords) like $${params.length})`;
    }
    sql += ' order by title asc';
    const { rows } = await query(sql, params);
    res.json(rows.map(toCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update song
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['title','lyrics','chords','category','ministryId'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const col = toSnakeKey(f);
        sets.push(`${col}=$${i++}`);
        values.push(req.body[f]);
      }
    }
    sets.push(`updated_at=$${i++}`);
    values.push(new Date().toISOString());
    values.push(req.params.id);
    const sql = `update songs set ${sets.join(', ')} where id=$${i} returning *`;
    const { rows } = await query(sql, values);
    res.json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete song
router.delete('/:id', async (req, res) => {
  try {
    await query('delete from songs where id=$1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toCamel(row){
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

function toSnakeKey(k){
  return k.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export default router;
