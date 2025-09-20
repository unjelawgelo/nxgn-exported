import 'dotenv/config';
import { readFile } from 'fs/promises';
import { pool } from '../pg.js';

async function migrate() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf-8');
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log('Migration completed');
  } catch (e) {
    await client.query('rollback');
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
