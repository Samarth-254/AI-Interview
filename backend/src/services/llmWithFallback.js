import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '../config/env.js';

/**
 * Ordered fallback list — tried in sequence until one succeeds.
 * These match the exact active model IDs from the user's Google developer project.
 * If one hits 429 or is rate-limited, it fails instantly (maxRetries: 0) and
 * falls back to the next model in the list.
 */
const FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
];

/**
 * Creates a LangChain runnable that calls models in order.
 * On any error (429, 503, etc.) from model N, it immediately tries model N+1.
 *
 * @param {number} temperature  LLM temperature (0-1)
 * @returns {import('@langchain/core/language_models/base').BaseLanguageModel}
 */
export function createLLMWithFallbacks(temperature = 0.7) {
  const instances = FALLBACK_MODELS.map((model) =>
    new ChatGoogleGenerativeAI({
      apiKey: env.llmApiKey,
      model,
      temperature,
      maxRetries: 0, // Fail instantly so the next fallback model is tried immediately
    })
  );

  const [primary, ...fallbacks] = instances;

  // LangChain's .withFallbacks() chains runnables: if primary throws, tries fallbacks[0], etc.
  return primary.withFallbacks({ fallbacks });
}
