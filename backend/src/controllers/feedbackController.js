import { feedbackModel } from '../models/feedbackModel.js';
import { sessionModel } from '../models/sessionModel.js';
import { feedbackService } from '../services/feedbackService.js';
import { transcriptModel } from '../models/transcriptModel.js';

export const getFeedback = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    const session = await sessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if session has enough turns before trying to load/generate feedback
    const transcript = await transcriptModel.findBySessionId(sessionId);
    if (!transcript || transcript.length < 2) {
      return res.status(422).json({
        success: false,
        noReportPossible: true,
        message: 'This session has too few transcript entries to generate a feedback report. Practice some more turns to generate a report!',
      });
    }

    // If session is still active (e.g. call was ejected), mark it completed so
    // we can generate feedback from whatever transcript was captured
    if (session.status === 'active') {
      await sessionModel.updateStatus(sessionId, 'completed');
    }

    let report = await feedbackModel.findBySessionId(sessionId);

    // If no report yet, try to generate now (blocking, so the client gets it immediately)
    if (!report) {
      try {
        report = await feedbackService.generateReport(sessionId);
      } catch (genErr) {
        console.error('[getFeedback] On-demand generation failed:', genErr.message);
        return res.status(202).json({
          success: false,
          retryAfter: 5,
          message: 'Feedback is still being generated. Please try again in a few seconds.',
        });
      }
    }

    if (!report) {
      return res.status(202).json({
        success: false,
        retryAfter: 5,
        message: 'Feedback report not yet available. Please try again shortly.',
      });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error('[getFeedback]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch feedback report' });
  }
};

export const triggerFeedbackGeneration = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const session = await sessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Trigger async generation
    feedbackService.generateReport(sessionId).catch((e) => {
      console.error('[triggerFeedbackGeneration]', e);
    });

    return res.status(202).json({ success: true, message: 'Feedback generation started' });
  } catch (err) {
    console.error('[triggerFeedbackGeneration]', err);
    return res.status(500).json({ success: false, message: 'Could not trigger feedback generation' });
  }
};
