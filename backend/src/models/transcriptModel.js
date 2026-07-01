import { pool } from '../config/db.js';

export const transcriptModel = {
  async create({ sessionId, speaker, content, sequenceNumber }) {
    const result = await pool.query(
      `INSERT INTO transcript_entries (session_id, speaker, content, sequence_number)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, speaker, content, sequenceNumber]
    );
    return result.rows[0];
  },

  async findBySessionId(sessionId) {
    const result = await pool.query(
      `SELECT * FROM transcript_entries
       WHERE session_id = $1
       ORDER BY sequence_number ASC`,
      [sessionId]
    );
    return result.rows;
  },

  async getNextSequenceNumber(sessionId) {
    const result = await pool.query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq
       FROM transcript_entries WHERE session_id = $1`,
      [sessionId]
    );
    return result.rows[0].next_seq;
  },

  async syncTranscript(sessionId, turns) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete existing transcript entries for this session
      await client.query('DELETE FROM transcript_entries WHERE session_id = $1', [sessionId]);
      
      // Bulk insert new turns
      for (let i = 0; i < turns.length; i++) {
        const { speaker, content } = turns[i];
        await client.query(
          `INSERT INTO transcript_entries (session_id, speaker, content, sequence_number)
           VALUES ($1, $2::speaker_role, $3, $4)`,
          [sessionId, speaker, content, i + 1]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};
