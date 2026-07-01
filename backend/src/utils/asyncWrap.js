/**
 * asyncWrap — local error handling utility.
 * Wraps a controller function so thrown errors are caught and returned as
 * structured JSON responses — locally, in context. Does NOT forward to next(err).
 * 
 * Usage: router.get('/path', asyncWrap(controller, 'Context description'))
 */
export const asyncWrap = (fn, context = 'operation') => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    console.error(`[asyncWrap:${context}]`, err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: `${context} failed` });
    }
  }
};
