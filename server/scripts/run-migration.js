import { query } from '../pg.js';

async function migrate() {
  try {
    await query(`
      ALTER TABLE playlists 
      ADD COLUMN IF NOT EXISTS category text,
      ADD COLUMN IF NOT EXISTS date text
    `);
    console.log('✅ Migration successful: Added category and date columns');
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
}

migrate();
