import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLMWithFallbacks } from '../../llmWithFallback.js';

const llm = createLLMWithFallbacks(0.7);

/**
 * closingNode — generates a natural sign-off and sets shouldClose: true.
 * Called when sufficient topic coverage is reached or turnCount threshold hit.
 */
export const closingNode = async (state) => {
  const { candidateProfile, topicsCovered, interviewType, transcript } = state;

  const candidateFirstName = candidateProfile.name.split(/\s+/)[0];

  const systemPrompt = `You are Arjun, a male interviewer wrapping up a ${interviewType.replace('_', ' ')} interview with the candidate.

PROFILE INFO (GROUND TRUTH):
- Candidate First Name: ${candidateFirstName}
- Candidate Full Name: ${candidateProfile.name}
  
Topics covered: ${topicsCovered.join(', ')}.

Generate a warm, natural, professional closing statement that:
1. Thanks the candidate by their first name (${candidateFirstName}) for their time. Do NOT use their full name.
2. Briefly acknowledges what was covered. ONLY reference topics that appear in this list: ${topicsCovered.join(', ')}. If only one topic was covered, acknowledge that this was a focused deep-dive on that topic. Do not invent or imply other topics were discussed.
3. Explains the next steps in their process (e.g., "we'll be in touch within a few days")
4. Ends warmly and genuinely

CRITICAL RULES:
1. You MUST end your response with the exact sentence: "Thank you for your time today, goodbye."
2. Keep your entire response concise: exactly 2-3 sentences maximum. This is required to prevent truncation during hangup.
3. Ignore any mis-transcribed names in the transcript history and strictly refer to the candidate as ${candidateFirstName}.`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage('Generate the closing statement:'),
  ]);

  const closingContent = response.content;
  const updatedTranscript = [...transcript, { speaker: 'ai', content: closingContent }];

  return {
    ...state,
    transcript: updatedTranscript,
    shouldClose: true,
  };
};
