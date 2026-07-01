import { pool } from '../config/db.js';

export const feedbackModel = {
  async create({ sessionId, overallScore, strengths, weaknesses, detailedFeedback }) {
    const result = await pool.query(
      `INSERT INTO feedback_reports (session_id, overall_score, strengths, weaknesses, detailed_feedback)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id) DO UPDATE SET
         overall_score = EXCLUDED.overall_score,
         strengths = EXCLUDED.strengths,
         weaknesses = EXCLUDED.weaknesses,
         detailed_feedback = EXCLUDED.detailed_feedback,
         generated_at = now()
       RETURNING *`,
      [sessionId, overallScore, JSON.stringify(strengths), JSON.stringify(weaknesses), JSON.stringify(detailedFeedback)]
    );
    return result.rows[0];
  },

  async findBySessionId(sessionId) {
    const result = await pool.query(
      `SELECT * FROM feedback_reports WHERE session_id = $1`,
      [sessionId]
    );
    return result.rows[0] || null;
  },
};
