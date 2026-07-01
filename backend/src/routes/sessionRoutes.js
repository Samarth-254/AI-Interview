import { Router } from 'express';
import { createSession, listSessions, getSession, endSession, getSessionProgress, abandonSession } from '../controllers/sessionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', createSession);
router.get('/', listSessions);
router.get('/:id', getSession);
router.get('/:id/progress', getSessionProgress);
router.post('/:id/end', endSession);
router.patch('/:id/abandon', abandonSession);

export default router;
