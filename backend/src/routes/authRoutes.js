import { Router } from 'express';
import { signup, login, getMe, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);

export default router;
