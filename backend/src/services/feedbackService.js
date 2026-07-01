import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLMWithFallbacks } from './llmWithFallback.js';
import { transcriptModel } from '../models/transcriptModel.js';
import { feedbackModel } from '../models/feedbackModel.js';
import { sessionModel } from '../models/sessionModel.js';
import { userModel } from '../models/userModel.js';

const llm = createLLMWithFallbacks(0.3);

/**
 * feedbackService — post-session report generation.
 * Analyzes the full transcript and generates a structured JSON feedback report.
 */
export const feedbackService = {
  async generateReport(sessionId) {
    console.log(`[feedbackService] Generating report for session ${sessionId}`);

    const session = await sessionModel.findById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const user = await userModel.findById(session.user_id);
    const transcript = await transcriptModel.findBySessionId(sessionId);

    if (transcript.length < 2) {
      console.warn(`[feedbackService] Session ${sessionId} has too few transcript entries to generate meaningful feedback`);
      return null;
    }

    const transcriptText = transcript
      .map((t) => `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert interview coach analyzing a completed ${session.interview_type.replace('_', ' ')} interview.
You MUST write all strengths descriptions, weaknesses descriptions, detailed feedback notes, and overall impressions in the SECOND PERSON, addressing the candidate directly (e.g. use "you", "your", "your communication", "you explained" instead of "the candidate", "the user", "Samarth", or third-person pronouns). The report must read as direct coaching to the candidate.

Candidate: ${user?.name || 'Unknown'}
Role: ${user?.job_role || 'Not specified'}
Experience: ${user?.experience_level || 'Not specified'}
Interview Type: ${session.interview_type}

Analyze the full transcript and return a JSON object with this EXACT structure:
{
  "overall_score": <number 0-10, one decimal place>,
  "strengths": [
    { "area": "<area name>", "description": "<specific observation with example from transcript>" },
    ...
  ],
  "weaknesses": [
    { "area": "<area name>", "description": "<specific observation with actionable improvement>" },
    ...
  ],
  "detailed_feedback": {
    "communication": { "score": <0-10>, "notes": "<assessment>" },
    "technical_depth": { "score": <0-10>, "notes": "<assessment>" },
    "examples_quality": { "score": <0-10>, "notes": "<assessment>" },
    "problem_solving": { "score": <0-10>, "notes": "<assessment>" },
    "overall_impression": "<2-3 sentence summary>"
  }
}

Be specific, fair, and constructive. Reference actual things said in the transcript.
Return ONLY the JSON object, no markdown, no explanation.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Full interview transcript:\n\n${transcriptText}\n\nGenerate the feedback report JSON:`),
    ]);

    let parsed;
    try {
      const rawContent = response.content.trim();
      // Strip markdown code fences if present
      const jsonStr = rawContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[feedbackService] Failed to parse LLM response as JSON:', parseErr);
      throw new Error('Feedback generation returned malformed JSON');
    }

    const report = await feedbackModel.create({
      sessionId,
      overallScore: parsed.overall_score,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      detailedFeedback: parsed.detailed_feedback,
    });

    console.log(`[feedbackService] Report saved for session ${sessionId}, score: ${parsed.overall_score}`);
    return report;
  },
};
