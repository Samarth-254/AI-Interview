import { sessionModel } from '../models/sessionModel.js';
import { transcriptModel } from '../models/transcriptModel.js';
import { voiceService } from '../services/voiceService.js';
import { interviewGraph } from '../services/conversationEngine/graph.js';
import { feedbackService } from '../services/feedbackService.js';
import { userModel } from '../models/userModel.js';
import { checkpointer } from '../services/conversationEngine/checkpointer.js';

export const createSession = async (req, res) => {
  try {
    const { interviewType, jobRole, experienceLevel } = req.body;
    const validTypes = ['behavioral', 'technical', 'system_design', 'hr_culture_fit'];

    if (!interviewType || !validTypes.includes(interviewType)) {
      return res.status(400).json({ success: false, message: `interviewType must be one of: ${validTypes.join(', ')}` });
    }

    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Use provided overrides or fall back to user profile
    const rawJobRole = jobRole || user.job_role || 'Software Engineer';
    const resolvedJobRole = rawJobRole.replace(/\s*[\/\\]\s*/g, ' or ');
    const resolvedExperienceLevel = experienceLevel || user.experience_level || 'mid';

    // Create session row first to get the ID
    const session = await sessionModel.create({ userId: req.user.userId, interviewType });

    // Initialize LangGraph state for this session
    await interviewGraph.initializeState(session.id, {
      interviewType,
      candidateProfile: {
        name: user.name,
        jobRole: resolvedJobRole,
        experienceLevel: resolvedExperienceLevel,
      },
    });

    // Create Vapi assistant with custom LLM config pointing to our webhook.
    // The frontend SDK starts the actual web call using the returned assistantId.
    const { assistantId } = await voiceService.createAssistant({
      sessionId: session.id,
      interviewType,
      candidateName: user.name,
      jobRole: resolvedJobRole,
      experienceLevel: resolvedExperienceLevel,
    });

    // Store assistantId so we can clean it up on session end
    await sessionModel.setVoiceCallId(session.id, assistantId);

    return res.status(201).json({
      success: true,
      data: {
        session: { ...session, voice_call_id: assistantId },
        vapiConfig: {
          assistantId,  // frontend calls vapi.start(assistantId)
        },
      },
    });
  } catch (err) {
    console.error('[createSession]', err);
    return res.status(500).json({ success: false, message: 'Could not create interview session' });
  }
};


export const listSessions = async (req, res) => {
  try {
    // Lazy stale sweep: any session stuck in 'active' for >10 min with no recent
    // transcript activity is auto-abandoned before the list is returned.
    await sessionModel.markStaleAsAbandoned(req.user.userId).catch((e) =>
      console.warn('[listSessions] stale sweep failed:', e.message)
    );
    const sessions = await sessionModel.findByUserId(req.user.userId);
    return res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    console.error('[listSessions]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch sessions' });
  }
};

export const getSession = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const session = await sessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const transcript = await transcriptModel.findBySessionId(sessionId);

    return res.status(200).json({ success: true, data: { session, transcript } });
  } catch (err) {
    console.error('[getSession]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch session' });
  }
};

export const endSession = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const session = await sessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (session.status !== 'active') {
      return res.status(200).json({ success: true, message: 'Session already completed' });
    }

    // End the Vapi call if one is active
    if (session.voice_call_id) {
      await voiceService.endCall(session.voice_call_id).catch((e) => {
        console.warn('[endSession] Could not end Vapi call:', e.message);
      });
    }

    const updated = await sessionModel.updateStatus(sessionId, 'completed');

    // Generate feedback report asynchronously (don't block the response)
    feedbackService.generateReport(sessionId).catch((e) => {
      console.error('[endSession] Feedback generation failed:', e);
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('[endSession]', err);
    return res.status(500).json({ success: false, message: 'Could not end session' });
  }
};

/**
 * abandonSession — called by the frontend when a Vapi error/unexpected
 * disconnect occurs while the page is still open. Uses a regular PATCH.
 * The sendBeacon (page unload) path on the client hits the same endpoint.
 */
export const abandonSession = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const session = await sessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (session.status !== 'active') {
      return res.status(200).json({ success: true, message: 'Session already resolved' });
    }

    const updated = await sessionModel.updateStatus(sessionId, 'abandoned');
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('[abandonSession]', err);
    return res.status(500).json({ success: false, message: 'Could not abandon session' });
  }
};

const THRESHOLDS = {
  behavioral: { maxTurns: 8 },
  hr_culture_fit: { maxTurns: 8 },
  technical: { maxTurns: 12 },
  system_design: { maxTurns: 12 },
};

export const getSessionProgress = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const session = await sessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const state = await checkpointer.load(String(sessionId));
    const limits = THRESHOLDS[session.interview_type] || THRESHOLDS.behavioral;

    return res.status(200).json({
      success: true,
      data: {
        turnCount: state ? state.turnCount : 0,
        maxTurns: limits.maxTurns,
        questionNumber: state ? (state.turnCount + 1) : 1,
      },
    });
  } catch (err) {
    console.error('[getSessionProgress]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch session progress' });
  }
};
