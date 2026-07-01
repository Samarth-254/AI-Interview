/**
 * Migration runner — reads 001_init.sql and executes it against the configured database.
 * Run once: node migrate.js
 */
import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(join(__dirname, 'migrations', '001_init.sql'), 'utf8');

try {
  await client.connect();
  console.log('[migrate] Connected to database');
  await client.query(sql);
  console.log('[migrate] ✅ Migration applied successfully');
} catch (err) {
  console.error('[migrate] ❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
