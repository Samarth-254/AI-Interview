import { Router } from 'express';
import { signup, login, getMe, updateProfile, forgotPassword, resetPassword, verifyResetToken } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token', verifyResetToken);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);

export default router;
