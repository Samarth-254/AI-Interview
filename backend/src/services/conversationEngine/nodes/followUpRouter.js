// Configurable thresholds per interview type (limits on turns / time in minutes)
const THRESHOLDS = {
  behavioral: { maxTurns: 8, maxMinutes: 10 },
  hr_culture_fit: { maxTurns: 8, maxMinutes: 10 },
  technical: { maxTurns: 12, maxMinutes: 20 },
  system_design: { maxTurns: 12, maxMinutes: 20 },
};

/**
 * followUpRouter — conditional edge logic.
 * Pure routing function — does NOT mutate state.
 * State updates (flaggedClaims, surpriseUsed, nextInstruction) are handled
 * by answerEvaluator which runs before this edge.
 * Returns a routing string: 'close' | 'probe' | 'advance'
 */
export const followUpRouter = (state) => {
  const {
    lastAnswerQuality,
    turnCount,
    shouldClose,
    interviewType,
    startedAt,
    nextInstruction,
  } = state;

  if (shouldClose) return 'close';

  // ── 1. HARD CEILING: turns + time limits ─────────────────────────────────
  const limits = THRESHOLDS[interviewType] || THRESHOLDS.behavioral;

  let timeLimitExceeded = false;
  if (startedAt) {
    const elapsedMinutes = (Date.now() - new Date(startedAt).getTime()) / 60000;
    if (elapsedMinutes >= limits.maxMinutes) timeLimitExceeded = true;
  }

  if (turnCount >= limits.maxTurns || timeLimitExceeded) {
    console.log(
      `[followUpRouter] Forced wrap-up: turnCount=${turnCount}/${limits.maxTurns}, timeLimitExceeded=${timeLimitExceeded}`
    );
    return 'close';
  }

  // ── 2. SURPRISE CALLBACK: answerEvaluator already set nextInstruction ────
  // Just route to probe so questionGenerator picks it up
  if (nextInstruction?.startsWith('SURPRISE_CALLBACK')) {
    console.log(`[followUpRouter] Surprise callback detected -> probe`);
    return 'probe';
  }

  // ── 3. STANDARD ROUTING ───────────────────────────────────────────────────
  const route =
    lastAnswerQuality === 'weak' || lastAnswerQuality === 'vague' ? 'probe' : 'advance';

  console.log(
    `[followUpRouter] sessionId=${state.sessionId} turn=${turnCount}/${limits.maxTurns} quality=${lastAnswerQuality} -> ${route}`
  );

  return route;
};