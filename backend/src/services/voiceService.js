import { env } from '../config/env.js';
import crypto from 'crypto';

const VAPI_API_BASE = 'https://api.vapi.ai';

/**
 * voiceService — ALL Vapi REST API calls live here, nowhere else.
 *
 * Architecture:
 *  - Backend creates a Vapi *assistant* (POST /assistant) with Custom LLM config.
 *  - Frontend SDK (@vapi-ai/web) starts the call directly using the returned assistantId.
 *    This is the only supported way for web/browser calls — Vapi's REST /call endpoint
 *    only accepts outboundPhoneCall / inboundPhoneCall types.
 *  - The webhook receives call.metadata.sessionId so the graph can be resumed.
 */
export const voiceService = {
  /**
   * Create a Vapi assistant configured for Custom LLM mode.
   * The assistant is reusable — we embed sessionId in metadata so the webhook
   * can load the correct graph state.
   * Returns { assistantId } which the frontend passes to vapi.start().
   */
  async createAssistant({ sessionId, interviewType, candidateName, jobRole, experienceLevel }) {
    // Vapi Custom LLM mode appends /chat/completions to this URL (OpenAI-compatible).
    // Embed sessionId as a path segment so the full URL Vapi calls becomes:
    //   POST /api/voice/webhook/:sessionId/chat/completions
    const webhookUrl = `${env.backendUrl}/api/voice/webhook/${sessionId}`;

    const body = {
      name: `Interview-Session-${sessionId}`,
      model: {
        provider: 'custom-llm',
        url: webhookUrl,
        model: 'interview-engine',
      },
      voice: {
        provider: '11labs',
        voiceId: 'burt',
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en-US',
        keywords: [
          ...(candidateName
            ? candidateName
                .split(/\s+/)
                .map((word) => word.replace(/[^a-zA-Z]/g, ''))
                .filter((word) => word.length > 0)
                .map((word) => `${word}:3`)
            : []),
          'Samarth:3',
          'Nagpal:3',
          'Arjun:3',
          'SDE:2',
          'API:2',
          'microservices:2',
          'scalability:2',
          'database:2',
          'React:2',
          'SQL:2',
        ],
      },
      // Give Vapi a concrete opening line so it speaks first without needing to call
      // our custom LLM webhook. The webhook is called only AFTER the candidate speaks.
      firstMessage: `Hi ${candidateName ? candidateName.split(/\s+/)[0] : 'there'}, I'm Arjun, and I'll be conducting your ${experienceLevel || 'mid'}-level ${jobRole || 'Software Engineer'} ${interviewType.replace('_', ' ')} interview today. When you're ready, please introduce yourself briefly — your background and what you're currently working on.`,
      clientMessages: ['transcript', 'speech-update', 'conversation-update'],
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 3600,
      backgroundSound: 'off',
      backchannelingEnabled: false,
      endCallPhrases: [
        "thank you for your time today, goodbye",
        "thank you for your time today. goodbye",
        "goodbye and good luck",
      ],
      metadata: {
        sessionId: String(sessionId),
        interviewType,
        candidateName,
        jobRole,
        experienceLevel,
      },
    };

    const response = await fetch(`${VAPI_API_BASE}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi createAssistant failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      assistantId: data.id,
    };
  },

  /**
   * Delete a Vapi assistant (cleanup after session ends).
   * Silently ignores 404 (already deleted).
   */
  async deleteAssistant(assistantId) {
    if (!assistantId) return;
    const response = await fetch(`${VAPI_API_BASE}/assistant/${assistantId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${env.vapiApiKey}` },
    });
    if (!response.ok && response.status !== 404) {
      console.warn(`[voiceService] deleteAssistant ${assistantId} returned ${response.status}`);
    }
    return true;
  },

  /**
   * End an active Vapi call by call ID (used when we have a call ID from an event).
   */
  async endCall(callId) {
    if (!callId) return;
    const response = await fetch(`${VAPI_API_BASE}/call/${callId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${env.vapiApiKey}` },
    });
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Vapi endCall failed: ${response.status} ${errorText}`);
    }
    return true;
  },

  /**
   * Verify a Vapi webhook signature.
   */
  verifyWebhookSignature(payload, signature) {
    if (!env.vapiWebhookSecret) return true;
    const expected = crypto
      .createHmac('sha256', env.vapiWebhookSecret)
      .update(payload)
      .digest('hex');
    return signature === expected;
  },
};
