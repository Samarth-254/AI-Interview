import { pool } from '../config/db.js';

export const sessionModel = {
  async create({ userId, interviewType }) {
    const result = await pool.query(
      `INSERT INTO interview_sessions (user_id, interview_type)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, interviewType]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM interview_sessions WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT s.*, f.overall_score
       FROM interview_sessions s
       LEFT JOIN feedback_reports f ON f.session_id = s.id
       WHERE s.user_id = $1
       ORDER BY s.started_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE interview_sessions
       SET status    = $1::session_status,
           ended_at  = CASE WHEN $1::session_status <> 'active'::session_status THEN now() ELSE ended_at END
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  },

  async setVoiceCallId(id, voiceCallId) {
    const result = await pool.query(
      `UPDATE interview_sessions SET voice_call_id = $1 WHERE id = $2 RETURNING *`,
      [voiceCallId, id]
    );
    return result.rows[0] || null;
  },

  /**
   * Lazy stale-session sweep: marks any session for this user that is still
   * 'active' but started more than 10 minutes ago and has received no transcript
   * entries in the last 10 minutes as 'abandoned'.
   */
  async markStaleAsAbandoned(userId) {
    await pool.query(
      `UPDATE interview_sessions s
       SET status   = 'abandoned'::session_status,
           ended_at = now()
       WHERE s.user_id = $1
         AND s.status  = 'active'::session_status
         AND s.started_at < now() - INTERVAL '10 minutes'
         AND NOT EXISTS (
           SELECT 1 FROM transcript_entries t
           WHERE t.session_id = s.id
             AND t.created_at > now() - INTERVAL '10 minutes'
         )`,
      [userId]
    );
  },
};
