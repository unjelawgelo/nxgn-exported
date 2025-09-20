import { readFileSync } from 'fs';
import { Pool } from 'pg';

function getSslConfig() {
  const caPath = process.env.PG_SSL_CA_PATH;
  const caInline = process.env.PG_SSL_CA;
  if (caPath) {
    return { rejectUnauthorized: true, ca: readFileSync(caPath, 'utf-8') };
  }
  if (caInline) {
    return { rejectUnauthorized: true, ca: caInline };
  }
  // Aiven typically requires SSL; warn if not present
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: getSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
