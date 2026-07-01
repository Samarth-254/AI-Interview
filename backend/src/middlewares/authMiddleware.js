import { authService } from '../services/authService.js';

export const authenticate = (req, res, next) => {
  // sendBeacon cannot set custom headers, so we accept a _token query param
  // as a fallback ONLY for that use-case. The Authorization header takes precedence.
  const authHeader = req.headers.authorization;
  const queryToken = req.query._token;

  if (!authHeader && !queryToken) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;

  try {
    const payload = authService.verifyToken(token);
    req.user = payload; // { userId, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
