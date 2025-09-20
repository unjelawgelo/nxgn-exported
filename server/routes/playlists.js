import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create playlist
router.post('/', async (req, res) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { name, description, ministryId, createdBy } = req.body;
    await query(
      `insert into playlists (id, name, description, ministry_id, created_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [id, name, description, ministryId, createdBy, now, now]
    );
    const { rows } = await query('select * from playlists where id=$1', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get by ministry
router.get('/', async (req, res) => {
  try {
    const { ministryId } = req.query;
    if (!ministryId) return res.status(400).json({ error: 'ministryId is required' });
    const { rows } = await query('select * from playlists where ministry_id=$1 order by name asc', [ministryId]);
    res.json(rows.map(toCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update playlist
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name','description'];
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
    const sql = `update playlists set ${sets.join(', ')} where id=$${i} returning *`;
    const { rows } = await query(sql, values);
    res.json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete playlist
router.delete('/:id', async (req, res) => {
  try {
    await query('delete from playlists where id=$1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toCamel(row){
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
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
