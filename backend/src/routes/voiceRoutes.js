import { Router } from 'express';
import { handleVapiWebhook, handleVapiEvent } from '../controllers/voiceWebhookController.js';

const router = Router();

// Custom LLM endpoint — Vapi appends /chat/completions to the base URL you configure.
// Base URL set in assistant: /api/voice/webhook/:sessionId
// Vapi calls: POST /api/voice/webhook/:sessionId/chat/completions
router.post('/webhook/:sessionId/chat/completions', handleVapiWebhook);

// Legacy fallback (direct POST to /webhook)
router.post('/webhook', handleVapiWebhook);

// Vapi lifecycle event webhooks (call.started, call.ended, etc.)
router.post('/event', handleVapiEvent);

export default router;
