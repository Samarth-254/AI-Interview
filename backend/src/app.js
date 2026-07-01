import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';

const app = express();

// CORS — allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Raw body capture for Vapi webhook signature verification
app.use((req, res, next) => {
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })(req, res, next);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// NOTE: No app.use(errorHandler) — all errors are handled locally in each controller.

export default app;
