/**
 * Migration runner — reads 001_init.sql and executes it against the configured database.
 * Run once: node migrate.js
 */
import 'dotenv/config';
import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('[migrate] Connected to database');

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`[migrate] Applying migration: ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    await client.query(sql);
  }

  console.log('[migrate] ✅ All migrations applied successfully');
} catch (err) {
  console.error('[migrate] ❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
