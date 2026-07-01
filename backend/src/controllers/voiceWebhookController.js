import { interviewGraph } from '../services/conversationEngine/graph.js';
import { transcriptModel } from '../models/transcriptModel.js';
import { sessionModel } from '../models/sessionModel.js';
import { feedbackService } from '../services/feedbackService.js';
import { voiceService } from '../services/voiceService.js';

/**
 * Sends an OpenAI-compatible SSE stream back to Vapi.
 * Vapi's Custom LLM mode requires Server-Sent Events — a plain JSON response
 * is silently dropped, which is what was causing the silence-timeout.
 */
function sendSSEResponse(res, content, model = 'interview-engine') {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const id = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  res.write(`data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }],
  })}\n\n`);

  res.write(`data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\n`);

  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * Returns true if the last user message is a repeat caused by a Vapi error recovery.
 * These turns should be passed through to the graph but NOT counted as real interview turns.
 * Detects:
 *   - Very short repeat answers (< 8 words) that follow an AI "please repeat" prompt
 *   - The AI's own error recovery message being the last AI turn
 */
function isErrorRecoveryTurn(messages = []) {
  const ERROR_RECOVERY_PHRASES = [
    'could you please repeat your last answer',
    'please repeat your last answer',
    'i encountered a brief technical issue',
    'could you repeat that',
  ];

  // Find the last AI message
  const reversed = [...messages].reverse();
  const lastAiMessage = reversed.find((m) => m.role === 'assistant');

  if (!lastAiMessage) return false;

  const aiText = lastAiMessage.content?.toLowerCase() || '';
  return ERROR_RECOVERY_PHRASES.some((phrase) => aiText.includes(phrase));
}

/**
 * Vapi Custom LLM webhook endpoint.
 *
 * Vapi calls this endpoint for every conversation turn, sending the full message
 * history in OpenAI chat completions format. We extract the latest candidate message,
 * run the LangGraph engine, and return the AI response as an SSE stream.
 *
 * Error recovery turns (where Vapi asked the candidate to repeat themselves) are
 * passed through to the graph with a flag so turnCount is NOT incremented.
 */
export const handleVapiWebhook = async (req, res) => {
  try {
    const { messages, call } = req.body;

    const sessionId =
      req.params.sessionId ||
      req.query.sessionId ||
      call?.metadata?.sessionId ||
      req.headers['x-session-id'];

    if (!sessionId || sessionId === 'chat') {
      console.warn('[voiceWebhook] No valid sessionId. params:', req.params, 'query:', req.query);
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    console.log(`[voiceWebhook] sessionId=${sessionId} messages=${(messages || []).length}`);

    // ── Detect error recovery turns — do not count these against turn budget ──
    const errorRecovery = isErrorRecoveryTurn(messages);
    if (errorRecovery) {
      console.log(`[voiceWebhook] sessionId=${sessionId} — error recovery turn detected, turnCount will not increment`);
    }

    const incomingTranscript = (messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        speaker: m.role === 'user' ? 'candidate' : 'ai',
        content: m.content,
      }));

    let aiResponse;
    let shouldClose = false;

    const lastUserMessage = (messages || []).find((m) => m.role === 'user');

    if (!lastUserMessage) {
      const result = await interviewGraph.processOpeningTurn(sessionId);
      aiResponse = result.content;
      shouldClose = result.shouldClose;

      await transcriptModel.syncTranscript(parseInt(sessionId, 10), result.state.transcript);
    } else {
      // Pass errorRecovery flag through so graph.js can skip turnCount increment
      const result = await interviewGraph.processCandidateTurn(
        sessionId,
        incomingTranscript,
        { skipTurnCount: errorRecovery }
      );
      aiResponse = result.content;
      shouldClose = result.shouldClose;

      await transcriptModel.syncTranscript(parseInt(sessionId, 10), result.state.transcript);
    }

    if (shouldClose) {
      await sessionModel.updateStatus(parseInt(sessionId, 10), 'completed');
      feedbackService.generateReport(parseInt(sessionId, 10)).catch((e) => {
        console.error('[voiceWebhook] Feedback generation failed:', e);
      });

      if (call?.id) {
        setTimeout(async () => {
          try {
            console.log(`[voiceWebhook] Automatically wrapping up completed Vapi call: ${call.id}`);
            await voiceService.endCall(call.id);
          } catch (err) {
            console.warn('[voiceWebhook] Failed to end Vapi call:', err.message);
          }
        }, 8000);
      }
    }

    return sendSSEResponse(res, aiResponse);
  } catch (err) {
    console.error('[handleVapiWebhook]', err);
    return sendSSEResponse(
      res,
      "I apologize, I encountered a brief technical issue. Could you please repeat your last answer?"
    );
  }
};

/**
 * Handle Vapi event webhooks (call.started, call.ended, etc.)
 * Separate from the Custom LLM endpoint — plain JSON is correct here.
 */
export const handleVapiEvent = async (req, res) => {
  try {
    const { type, call } = req.body;
    console.log(`[vapiEvent] ${type}`, call?.id);

    if (type === 'call-ended' || type === 'call.ended') {
      const sessionId = call?.metadata?.sessionId;
      if (sessionId) {
        const session = await sessionModel.findById(parseInt(sessionId, 10));
        if (session && session.status === 'active') {
          await sessionModel.updateStatus(parseInt(sessionId, 10), 'completed');
          feedbackService.generateReport(parseInt(sessionId, 10)).catch((e) => {
            console.error('[vapiEvent] Feedback generation failed:', e);
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[handleVapiEvent]', err);
    return res.status(200).json({ received: true });
  }
};