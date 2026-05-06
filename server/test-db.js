import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';

async function test() {
  console.log('Starting DB test...');
  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(process.env.PG_SSL_CA_PATH, 'utf-8'),
    },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('✅ Connection successful!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

test();
