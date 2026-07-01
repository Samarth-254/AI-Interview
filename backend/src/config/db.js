import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: env.databaseUrl.includes('sslmode=') || env.databaseUrl.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

// Verify connection at startup
export const connectDb = async () => {
  const client = await pool.connect();
  console.log('[db] PostgreSQL connected');
  client.release();
};
