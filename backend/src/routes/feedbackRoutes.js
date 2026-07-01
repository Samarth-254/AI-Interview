import { Router } from 'express';
import { getFeedback, triggerFeedbackGeneration } from '../controllers/feedbackController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/:sessionId', getFeedback);
router.post('/:sessionId/generate', triggerFeedbackGeneration);

export default router;
