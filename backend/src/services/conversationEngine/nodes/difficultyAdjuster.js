import { topicBanks } from '../state.js';

/**
 * difficultyAdjuster node — bumps difficulty level and picks the next topic.
 * Only runs after a 'strong' answer via followUpRouter.
 */
export const difficultyAdjuster = async (state) => {
  const { interviewType, difficultyLevel, topicsCovered, currentTopic } = state;

  // Bump difficulty, capped at 5
  const newDifficulty = Math.min(5, difficultyLevel + 1);

  // Mark current topic as covered
  const updatedCovered = currentTopic && !topicsCovered.includes(currentTopic)
    ? [...topicsCovered, currentTopic]
    : topicsCovered;

  // Pick next topic sequentially
  const bank = topicBanks[interviewType] || topicBanks.behavioral;
  const remaining = bank.filter((t) => !updatedCovered.includes(t));

  if (remaining.length === 0) {
    // All topics exhausted — cycle back sequentially starting from first topic
    console.log(`[difficultyAdjuster] All topics exhausted. Cycling back to first topic: "${bank[0]}"`);
    return {
      ...state,
      difficultyLevel: newDifficulty,
      topicsCovered: updatedCovered,
      currentTopic: bank[0],
      nextInstruction: `The candidate handled all topics well. Return to the first topic "${bank[0]}" for a new deep-dive question at higher difficulty ${newDifficulty}/5.`,
    };
  }

  // Select the first unused topic in sequence
  const nextTopic = remaining[0];

  return {
    ...state,
    difficultyLevel: newDifficulty,
    topicsCovered: updatedCovered,
    currentTopic: nextTopic,
    nextInstruction: `The candidate handled the previous topic well. Transition naturally to a new topic: "${nextTopic}" at difficulty level ${newDifficulty}/5.`,
  };
};
