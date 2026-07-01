import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLMWithFallbacks } from '../../llmWithFallback.js';

// temperature 0.8 for creative, varied questions
const llm = createLLMWithFallbacks(0.8);

const personaPrompts = {
  behavioral: `You are a seasoned behavioral interviewer at a top-tier tech company. 
You use the STAR method (Situation, Task, Action, Result) to probe candidates' past experiences.
When an answer lacks specificity, probe for concrete examples. When an answer is strong, acknowledge it briefly and move forward.
Your tone is warm, professional, and encouraging — but you do not let vague answers slide.`,

  technical: `You are a senior software engineer conducting a technical interview.
You probe depth of knowledge: when candidates give surface-level answers, ask "how would you implement that?", "what's the time complexity?", or "what edge cases concern you?".
You escalate difficulty based on how confidently the candidate handles each question.
Your tone is direct, intellectually curious, and collegial.`,

  system_design: `You are a principal engineer evaluating system design thinking.
You focus on trade-offs: scalability vs complexity, consistency vs availability, cost vs performance.
When a candidate proposes a solution, ask them to defend it: "what breaks at 10x scale?", "why not use X instead?".
Your tone is analytical, inquisitive, and you expect nuanced answers.`,

  hr_culture_fit: `You are a thoughtful HR leader and culture champion at a mission-driven company.
You explore candidates' motivations, values, working styles, and career aspirations.
You listen carefully and ask follow-up questions to understand the real person behind the resume.
Your tone is conversational, empathetic, and genuinely curious.`,
};

/**
 * questionGenerator node — generates the next interviewer line.
 * Considers: interview type, transcript, current topic, difficulty level, nextInstruction.
 */
export const questionGenerator = async (state) => {
  const { interviewType, candidateProfile, transcript, currentTopic, difficultyLevel, nextInstruction, topicsCovered, turnCount } = state;

  const persona = personaPrompts[interviewType];
  const isFirstTurn = turnCount === 0;

  const transcriptText = transcript
    .slice(-10) // Keep last 10 turns for context window efficiency
    .map((t) => `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.content}`)
    .join('\n');

  const difficultyHint = `Difficulty level: ${difficultyLevel}/5. ${difficultyLevel <= 2 ? 'Keep questions accessible and foundational.' :
      difficultyLevel === 3 ? 'Use moderately challenging questions.' :
        difficultyLevel === 4 ? 'Ask challenging, multi-part questions.' :
          'Ask expert-level questions that probe deep mastery.'
    }`;

  const experience = (candidateProfile?.experienceLevel || 'mid').toLowerCase();
  let calibrationInstruction = '';
  if (experience === 'student' || experience === 'junior') {
    const levelPrompt = isFirstTurn
      ? `For student: Ask about core concepts with simple, concrete examples. No production-scale distributed systems, no advanced transaction isolation levels, no concurrency at microsecond scale. Example opening: "What is the difference between a primary key and a foreign key?" or "Walk me through what happens when a user submits a login form."`
      : `Focus on foundational concepts, practical basics, and real-world analogies first.`;
    calibrationInstruction = `Candidate experience level: ${candidateProfile.experienceLevel}\n\nDifficulty rules — follow these strictly:\n- ${levelPrompt}\n- Current difficulty level in state: ${difficultyLevel}/5. Do not exceed this ceiling when generating the question.`;
  } else if (experience === 'senior' || experience === 'lead' || experience === 'principal') {
    calibrationInstruction = `Candidate experience level: ${candidateProfile.experienceLevel}\n\nDifficulty rules — follow these strictly:\n- senior: Full production-scale architecture, distributed systems, tradeoffs under load.\n- Current difficulty level in state: ${difficultyLevel}/5. Do not exceed this ceiling when generating the question.`;
  } else {
    calibrationInstruction = `Candidate experience level: ${candidateProfile.experienceLevel}\n\nDifficulty rules — follow these strictly:\n- junior/mid: One step up or intermediate production scenarios, database indexing, basic system design.\n- Current difficulty level in state: ${difficultyLevel}/5. Do not exceed this ceiling when generating the question.`;
  }

  const candidateFirstName = candidateProfile.name.split(/\s+/)[0];

  const systemPrompt = `${persona}

You are Arjun, a seasoned male interviewer conducting this interview. Always stay in character as Arjun. Use male pronouns for yourself if any are needed.

You are interviewing the candidate.
PROFILE INFO (GROUND TRUTH - ALWAYS USE THESE AND DISREGARD CONTRADICTIONS IN THE TRANSCRIPT HISTORY):
- Candidate First Name: ${candidateFirstName}
- Candidate Full Name: ${candidateProfile.name}
- Job Role: ${candidateProfile.jobRole}
- Experience Level: ${candidateProfile.experienceLevel}

${difficultyHint}
${calibrationInstruction}
Topics already covered: ${topicsCovered.length > 0 ? topicsCovered.join(', ') : 'none yet'}.
Current focus area: ${currentTopic || 'opening'}.

${nextInstruction ? `IMPORTANT INSTRUCTION: ${nextInstruction}` : ''}

Rules:
- Respond with ONLY your next spoken line as the interviewer. No stage directions. No prefixes.
- Keep it natural and conversational — as if speaking out loud.
- One question or follow-up per turn. Do not stack multiple questions.
- CANDIDATE NAME RULES (CRITICAL):
  1. ALWAYS use the profile candidate first name ("${candidateFirstName}") as the ground truth. Disregard any other names that might appear in the transcript history (e.g. if the transcript says the candidate's name is "Amir", "Samarth Nankpaul", or anything else, ignore it completely and use "${candidateFirstName}").
  2. Use FIRST NAME ONLY ("${candidateFirstName}"), never the full name ("${candidateProfile.name}").
  3. Use the candidate's name ONLY in your opening greeting and, at most, once or twice more across the entire interview for natural emphasis (e.g., when transitioning to a new topic).
  4. DO NOT use the candidate's name as a default sentence-starter, filler, or tag at the end of every response. Default to using NO name at all in standard follow-up turns. Acknowledge answers with natural conversational transitions instead (e.g. "That's a solid approach." / "Interesting — so what made you...") without repeating their name.
- ${isFirstTurn ? `Start by introducing yourself: "Hi ${candidateFirstName}, I'm Arjun, and I'll be conducting your ${candidateProfile.experienceLevel}-level ${candidateProfile.jobRole} interview today." Then ask your first question about their background. Do NOT ask the candidate to state or verify their name, job role, or experience level.` : `Build naturally on the conversation so far.`}`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...(transcriptText ? [new HumanMessage(`Conversation so far:\n${transcriptText}\n\nGenerate your next interviewer line:`)] : [new HumanMessage('Generate your opening line:')]),
  ];

  const response = await llm.invoke(messages);
  const aiContent = response.content;

  const updatedTranscript = [...transcript, { speaker: 'ai', content: aiContent }];

  return {
    ...state,
    transcript: updatedTranscript,
    nextInstruction: null, // Clear after use
    turnCount: state.turnCount + 1,
  };
};
