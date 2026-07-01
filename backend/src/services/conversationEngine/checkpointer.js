import { pool } from '../../config/db.js';

/**
 * Postgres-backed checkpointer for LangGraph state.
 * Keyed by thread_id = sessionId (as string).
 * Each Vapi webhook call loads state, runs graph step, saves updated state.
 */
export const checkpointer = {
  async load(threadId) {
    const result = await pool.query(
      `SELECT state FROM graph_checkpoints WHERE thread_id = $1`,
      [String(threadId)]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].state;
  },

  async save(threadId, state) {
    await pool.query(
      `INSERT INTO graph_checkpoints (thread_id, state, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (thread_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
      [String(threadId), JSON.stringify(state)]
    );
  },

  async delete(threadId) {
    await pool.query(
      `DELETE FROM graph_checkpoints WHERE thread_id = $1`,
      [String(threadId)]
    );
  },
};
