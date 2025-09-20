import 'dotenv/config';
import { pool } from '../pg.js';

const statements = `
  drop table if exists playlist_song_transitions cascade;
  drop table if exists playlist_songs cascade;
  drop table if exists playlists cascade;
  drop table if exists songs cascade;
  drop table if exists join_requests cascade;
  drop table if exists users cascade;
  drop table if exists ministries cascade;
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(statements);
    await client.query('commit');
    console.log('Reset completed.');
  } catch (e) {
    await client.query('rollback');
    console.error('Reset failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
