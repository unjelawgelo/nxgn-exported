import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create ministry
router.post('/', async (req, res) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { name, passcode, adminId, description, profilePhoto } = req.body;
    await query(
      `insert into ministries (id, name, passcode, admin_id, description, profile_photo, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, name, passcode, adminId, description, profilePhoto, now, now]
    );
    const { rows } = await query('select * from ministries where id=$1', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all
router.get('/', async (_req, res) => {
  try {
    const { rows } = await query('select * from ministries order by name asc');
    res.json(rows.map(toCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Find by passcode
router.get('/by-passcode/:passcode', async (req, res) => {
  try {
    const { rows } = await query('select * from ministries where passcode=$1 limit 1', [req.params.passcode]);
    res.json(rows[0] ? toCamel(rows[0]) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Find by id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('select * from ministries where id=$1', [req.params.id]);
    res.json(rows[0] ? toCamel(rows[0]) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name','passcode','adminId','description','profilePhoto'];
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
    const sql = `update ministries set ${sets.join(', ')} where id=$${i} returning *`;
    const { rows } = await query(sql, values);
    res.json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete ministry
router.delete('/:id', async (req, res) => {
  try {
    await query('delete from ministries where id=$1', [req.params.id]);
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
    passcode: row.passcode,
    adminId: row.admin_id,
    description: row.description,
    profilePhoto: row.profile_photo,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function toSnakeKey(k){
  return k.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export default router;
