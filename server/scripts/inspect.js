import 'dotenv/config';
import { pool } from '../pg.js';

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB:', process.env.PGHOST, process.env.PGDATABASE);

    const tablesRes = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Public tables:', tables.length ? tables.join(', ') : '(none)');

    for (const t of tables) {
      const countRes = await client.query(`select count(*)::int as cnt from ${t};`);
      console.log(`- ${t}: ${countRes.rows[0].cnt} rows`);
    }

    // Show a few sample rows from key tables
    const peek = async (name) => {
      if (!tables.includes(name)) return;
      const res = await client.query(`select * from ${name} limit 3;`);
      console.log(`\nSample from ${name}:`);
      for (const row of res.rows) {
        console.log(row);
      }
    };

    await peek('ministries');
    await peek('users');
    await peek('songs');
    await peek('playlists');

  } catch (e) {
    console.error('Inspect failed:', e?.stack || e);
    process.exitCode = 1;
  } finally {
    pool.end();
  }
}

run();
