import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE playlists 
      ADD COLUMN IF NOT EXISTS category text,
      ADD COLUMN IF NOT EXISTS date text
    `);
    console.log('✅ Migration successful!');
    console.log('Added category and date columns to playlists table');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
