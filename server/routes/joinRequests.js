import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create join request
router.post('/', async (req, res) => {
  try {
    const id = uuidv4();
    const { ministryId, userName, pincode } = req.body;
    await query(
      `insert into join_requests (id, ministry_id, user_name, pincode, status, requested_at)
       values ($1,$2,$3,$4,'pending', now())`,
      [id, ministryId, userName, pincode]
    );
    const { rows } = await query('select * from join_requests where id=$1', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get pending for ministry
router.get('/pending', async (req, res) => {
  try {
    const { ministryId } = req.query;
    if (!ministryId) return res.status(400).json({ error: 'ministryId is required' });
    const { rows } = await query(
      `select * from join_requests where ministry_id=$1 and status='pending' order by requested_at desc`,
      [ministryId]
    );
    res.json(rows.map(toCamel));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approve
router.post('/:id/approve', async (req, res) => {
  try {
    const { reviewedBy } = req.body;
    const { rows } = await query(
      `update join_requests set status='approved', reviewed_at=now(), reviewed_by=$1 where id=$2 returning *`,
      [reviewedBy ?? null, req.params.id]
    );
    res.json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Decline
router.post('/:id/decline', async (req, res) => {
  try {
    const { reviewedBy } = req.body;
    const { rows } = await query(
      `update join_requests set status='declined', reviewed_at=now(), reviewed_by=$1 where id=$2 returning *`,
      [reviewedBy ?? null, req.params.id]
    );
    res.json(toCamel(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toCamel(row){
  if (!row) return row;
  return {
    id: row.id,
    ministryId: row.ministry_id,
    userName: row.user_name,
    pincode: row.pincode,
    status: row.status,
    requestedAt: row.requested_at?.toISOString?.() ?? row.requested_at,
    reviewedAt: row.reviewed_at?.toISOString?.() ?? row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

export default router;
