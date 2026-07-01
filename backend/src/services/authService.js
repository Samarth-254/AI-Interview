import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

export const authService = {
  async hashPassword(plainText) {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  },

  async comparePassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  },

  signToken(payload) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
  },

  verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
  },
};
