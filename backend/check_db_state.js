import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const sessionsRes = await client.query(
  `SELECT * FROM interview_sessions ORDER BY started_at DESC LIMIT 5`
);

console.log('--- RECENT SESSIONS ---');
for (const s of sessionsRes.rows) {
  console.log(`Session ID: ${s.id} | Status: ${s.status} | Type: ${s.interview_type} | Started: ${s.started_at}`);
  
  const transRes = await client.query(
    `SELECT speaker, content, sequence_number FROM transcript_entries 
     WHERE session_id = $1 ORDER BY sequence_number ASC`,
    [s.id]
  );
  
  console.log('Transcript:');
  if (transRes.rows.length === 0) {
    console.log('  (empty)');
  }
  for (const t of transRes.rows) {
    console.log(`  [${t.sequence_number}] ${t.speaker.toUpperCase()}: ${t.content}`);
  }
  console.log('------------------------\n');
}

await client.end();
