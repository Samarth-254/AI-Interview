import crypto from 'crypto';
import { authService } from '../services/authService.js';
import { userModel } from '../models/userModel.js';
import { env } from '../config/env.js';

export const signup = async (req, res) => {
  try {
    const { name, email, password, jobRole, experienceLevel } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await authService.hashPassword(password);
    const user = await userModel.create({ name, email, passwordHash, jobRole, experienceLevel });

    const token = authService.signToken({ userId: user.id, email: user.email });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, jobRole: user.job_role, experienceLevel: user.experience_level },
      },
    });
  } catch (err) {
    console.error('[signup]', err);
    return res.status(500).json({ success: false, message: 'Could not create account' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await authService.comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = authService.signToken({ userId: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, jobRole: user.job_role, experienceLevel: user.experience_level },
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('[getMe]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch user' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, jobRole, experienceLevel } = req.body;
    const user = await userModel.updateProfile(req.user.userId, { name, jobRole, experienceLevel });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ success: false, message: 'Could not update profile' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      // Return success even if email doesn't exist for security reasons
      return res.status(200).json({
        success: true,
        message: 'If the email is registered, a password reset link has been sent.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await userModel.updateResetToken(user.id, token, expiresAt);

    const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;

    // Send transactional email via Brevo
    try {
      console.log(`[forgotPassword] Attempting to send reset email to: ${user.email} from verified sender: ${env.brevoSenderEmail}`);
      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: env.brevoSenderName,
            email: env.brevoSenderEmail,
          },
          to: [{ email: user.email, name: user.name }],
          subject: 'Reset your password - InterviewAI',
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1a202c; margin-bottom: 16px;">Password Reset Request</h2>
              <p style="color: #4a5568; line-height: 1.6;">Hello ${user.name},</p>
              <p style="color: #4a5568; line-height: 1.6;">We received a request to reset your password for your InterviewAI account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
              <div style="margin: 24px 0;">
                <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #718096; font-size: 0.875rem;">If you did not request a password reset, you can safely ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #a0aec0; font-size: 0.75rem;">If the button doesn't work, copy and paste this URL into your browser:</p>
              <p style="color: #3182ce; font-size: 0.75rem; word-break: break-all;">${resetLink}</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errorText = await emailRes.text();
        console.error('[forgotPassword] Brevo API error:', errorText);
        throw new Error('Failed to send reset email via Brevo');
      } else {
        const result = await emailRes.json();
        console.log('[forgotPassword] Brevo API success:', result);
      }
    } catch (mailErr) {
      console.error('[forgotPassword] Mail send failed:', mailErr);
      return res.status(500).json({ success: false, message: 'Could not send reset password email. Please try again later.' });
    }

    return res.status(200).json({
      success: true,
      message: 'If the email is registered, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const user = await userModel.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const expiresAt = new Date(user.reset_password_expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
    });
  } catch (err) {
    console.error('[verifyResetToken]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await userModel.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const expiresAt = new Date(user.reset_password_expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    const passwordHash = await authService.hashPassword(password);
    await userModel.updatePassword(user.id, passwordHash);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
