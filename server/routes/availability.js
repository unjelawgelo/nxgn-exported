import { Router } from 'express';
import { query } from '../pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get current user's availability
router.get('/me', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { rows } = await query(
      `SELECT * FROM member_availability 
       WHERE user_id = $1 
       AND effective_date = CURRENT_DATE
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    res.json(rows[0] || { status: 'undecided' }); // Default to undecided if no record exists
  } catch (e) {
    console.error('Error in /me:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get team availability
router.get('/team', async (req, res) => {
  try {
    const { ministryId } = req.query;
    if (!ministryId) return res.status(400).json({ error: 'ministryId is required' });

    // First, let's verify the users table structure
    const { rows } = await query(
      `SELECT 
         u.id, 
         u.name, 
         COALESCE(u.role, 'member') as role,
         u.custom_tag as "customTag",
         u.tag_color as "tagColor",
         u.profile_photo as "profilePhoto",
         COALESCE(u.status, 'active') as status,
         COALESCE(ma.status, 'undecided') as "availability"
       FROM users u
       LEFT JOIN (
         SELECT DISTINCT ON (user_id) user_id, status
         FROM member_availability
         WHERE effective_date = CURRENT_DATE
         ORDER BY user_id, created_at DESC
       ) ma ON u.id = ma.user_id
       WHERE u.ministry_id = $1
       ORDER BY 
         CASE 
           WHEN ma.status = 'available' THEN 1
           WHEN ma.status = 'undecided' OR ma.status IS NULL THEN 2
           ELSE 3 
         END,
         u.name`,
      [ministryId]
    );

    res.json(rows);
  } catch (e) {
    console.error('Error in /team:', e);
    res.status(500).json({ error: e.message });
  }
});

// Update availability
router.post('/', async (req, res) => {
  try {
    const { userId, status, notes } = req.body;
    if (!userId || !status) {
      return res.status(400).json({ error: 'userId and status are required' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    await query(
      `INSERT INTO member_availability 
       (id, user_id, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, effective_date) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at`,
      [id, userId, status, notes, now, now]
    );

    res.status(201).json({ id, status, notes });
  } catch (e) {
    console.error('Error updating availability:', e);
    res.status(500).json({ error: e.message });
  }
});

// Test route - you can remove this later
router.get('/test', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await query('SELECT NOW() as time');
    
    // Test table exists
    const tableTest = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'member_availability'
    `);
    
    res.json({
      status: 'success',
      database: {
        connected: true,
        time: dbTest.rows[0].time
      },
      table: {
        exists: tableTest.rows.length > 0,
        columns: tableTest.rows
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
