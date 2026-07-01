import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLMWithFallbacks } from '../../llmWithFallback.js';

const llm = createLLMWithFallbacks(0.1);

const SURPRISE_MIN_TURN = 3;

const TURN_CEILINGS = {
  behavioral: 8,
  hr_culture_fit: 8,
  technical: 12,
  system_design: 12,
};

/**
 * answerEvaluator node — classifies the candidate's last answer as strong/weak/vague.
 * On turn 1 (opening intro), also flags vague/unsubstantiated claims for later challenge.
 * On turn 3+, checks if a surprise callback should be queued into nextInstruction.
 * Surprise fires on a strong answer OR as a guaranteed fallback when 2 turns remain.
 */
export const answerEvaluator = async (state) => {
  const {
    transcript,
    interviewType,
    currentTopic,
    turnCount,
    flaggedClaims = [],
    surpriseUsed = false,
  } = state;

  const lastCandidateTurn = [...transcript].reverse().find((t) => t.speaker === 'candidate');
  if (!lastCandidateTurn) {
    return { ...state, lastAnswerQuality: null };
  }

  const recentContext = transcript
    .slice(-6)
    .map((t) => `${t.speaker === 'ai' ? 'Q' : 'A'}: ${t.content}`)
    .join('\n');

  // ── 1. Standard quality classification ───────────────────────────────────
  const classifyPrompt = `You are an expert interview evaluator. Classify the candidate's answer quality.

Interview type: ${interviewType}
Topic: ${currentTopic}

Recent conversation:
${recentContext}

Classify the LAST candidate answer as exactly one of:
- "strong": Specific, structured, demonstrates clear competency with concrete examples or deep knowledge
- "weak": Superficial, missing key details, does not adequately demonstrate the required competency
- "vague": Too general, ambiguous, lacks specifics — needs probing to extract substance

Respond with ONLY one word: strong, weak, or vague.`;

  const classifyResponse = await llm.invoke([
    new SystemMessage(classifyPrompt),
    new HumanMessage('Classify the answer:'),
  ]);

  const raw = classifyResponse.content.trim().toLowerCase();
  const quality = ['strong', 'weak', 'vague'].includes(raw) ? raw : 'vague';

  // ── 2. Intro claim flagging — only on turn 1 ─────────────────────────────
  let newFlaggedClaims = flaggedClaims;

  if (turnCount === 1 && !surpriseUsed) {
    const flagPrompt = `You are an expert interviewer reviewing a candidate's opening introduction.

Candidate intro:
"${lastCandidateTurn.content}"

Identify up to 3 claims the candidate made that are vague, name-dropped without detail, or glossed over.
These are things a sharp interviewer would circle back to later — e.g. an internship mentioned without saying what they built, a project name dropped without explaining the outcome, a technology listed without depth.

Respond with a JSON array of short claim strings (max 12 words each). If nothing worth flagging, return [].
Example: ["internship at DISH TV — no details on what was built", "NextFlo project — outcome unclear"]

Return ONLY the JSON array, no other text.`;

    try {
      const flagResponse = await llm.invoke([
        new SystemMessage(flagPrompt),
        new HumanMessage('List the vague claims:'),
      ]);

      const parsed = JSON.parse(flagResponse.content.trim());
      if (Array.isArray(parsed)) {
        newFlaggedClaims = parsed
          .slice(0, 3)
          .map((claim) => ({ claim, challenged: false }));
      }
    } catch {
      newFlaggedClaims = [];
    }
  }

  // ── 3. Surprise callback trigger ─────────────────────────────────────────
  // Primary trigger: strong answer at turn 3+
  // Fallback trigger: 2 turns remaining and surprise still unused — fire regardless
  let updatedFlaggedClaims = newFlaggedClaims;
  let updatedSurpriseUsed = surpriseUsed;
  let surpriseInstruction = null;

  const maxTurns = TURN_CEILINGS[interviewType] || 8;
  const turnsRemaining = maxTurns - turnCount;
  const unchallengedClaim = newFlaggedClaims.find((c) => !c.challenged);

  const shouldFireSurprise =
    unchallengedClaim &&
    !surpriseUsed &&
    turnCount >= SURPRISE_MIN_TURN &&
    (quality === 'strong' || turnsRemaining <= 2); // guaranteed fallback

  if (shouldFireSurprise) {
    updatedFlaggedClaims = newFlaggedClaims.map((c) =>
      c.claim === unchallengedClaim.claim ? { ...c, challenged: true } : c
    );
    updatedSurpriseUsed = true;
    surpriseInstruction = `SURPRISE_CALLBACK: The candidate mentioned this in their intro but never substantiated it: "${unchallengedClaim.claim}". Circle back and ask a sharp, specific follow-up about it now. Do not signal that you stored this — ask as if it just occurred to you naturally.`;

    console.log(
      `[answerEvaluator] SURPRISE queued at turn ${turnCount}/${maxTurns} (turnsRemaining=${turnsRemaining}, quality=${quality}): "${unchallengedClaim.claim}"`
    );
  }

  return {
    ...state,
    lastAnswerQuality: quality,
    flaggedClaims: updatedFlaggedClaims,
    surpriseUsed: updatedSurpriseUsed,
    nextInstruction: surpriseInstruction ?? state.nextInstruction,
  };
};