import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create user
router.post('/', async (req, res) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { name, pincode, role, ministryId, status, profilePhoto, customTag, tagColor } = req.body;
    await query(
      `insert into users (id, name, pincode, role, ministry_id, status, profile_photo, custom_tag, tag_color, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, name, pincode, role, ministryId, status, profilePhoto, customTag, tagColor, now, now]
    );
    const { rows } = await query('select * from users where id=$1', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Find by pincode (first match)
router.get('/by-pincode/:pincode', async (req, res) => {
  try {
    const { rows } = await query('select * from users where pincode=$1 limit 1', [req.params.pincode]);
    res.json(rows[0] ? toCamel(rows[0]) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Find by id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('select * from users where id=$1', [req.params.id]);
    res.json(rows[0] ? toCamel(rows[0]) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get by ministry
router.get('/', async (req, res) => {
  try {
    const { ministryId } = req.query;
    if (ministryId) {
      const { rows } = await query('select * from users where ministry_id=$1 order by name asc', [ministryId]);
      return res.json(rows.map(toCamel));
    }
    const { rows } = await query('select * from users order by name asc');
    return res.json(rows.map(toCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name','pincode','role','ministryId','status','profilePhoto','customTag','tagColor'];
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
    const sql = `update users set ${sets.join(', ')} where id=$${i} returning *`;
    const { rows } = await query(sql, values);
    res.json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toCamel(row){
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    pincode: row.pincode,
    role: row.role,
    ministryId: row.ministry_id,
    status: row.status,
    profilePhoto: row.profile_photo,
    customTag: row.custom_tag,
    tagColor: row.tag_color,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function toSnakeKey(k){
  return k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
}

// Delete user
router.delete('/:id', async (req, res) => {
  console.log(`DELETE /api/users/${req.params.id} called`);
  try {
    // First, delete any dependent records (like playlist_songs, playlists, etc.)
    // that might have foreign key constraints
    console.log('Deleting dependent records...');
    
    // Check the actual column names in your database
    // For now, we'll try with the most common column names
    try {
      await query('DELETE FROM playlist_songs WHERE playlist_id IN (SELECT id FROM playlists WHERE "userId" = $1)', [req.params.id]);
      await query('DELETE FROM playlists WHERE "userId" = $1', [req.params.id]);
    } catch (e) {
      console.log('Error deleting dependent records (this might be expected if tables/columns don\'t exist):', e.message);
    }
    
    // Now delete the user
    console.log('Deleting user...');
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    
    if (rowCount === 0) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User deleted successfully');
    res.status(204).send();
  } catch (e) {
    console.error('Failed to delete user:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
