import { pool } from '../config/db.js';

export const userModel = {
  async create({ name, email, passwordHash, jobRole, experienceLevel }) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, job_role, experience_level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, job_role, experience_level, created_at`,
      [name, email, passwordHash, jobRole || null, experienceLevel || null]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      `SELECT id, name, email, password_hash, job_role, experience_level, created_at
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT id, name, email, job_role, experience_level, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async updateProfile(id, { name, jobRole, experienceLevel }) {
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           job_role = COALESCE($2, job_role),
           experience_level = COALESCE($3, experience_level)
       WHERE id = $4
       RETURNING id, name, email, job_role as "jobRole", experience_level as "experienceLevel"`,
      [name || null, jobRole || null, experienceLevel || null, id]
    );
    return result.rows[0] || null;
  },
};
