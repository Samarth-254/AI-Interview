import { authService } from '../services/authService.js';
import { userModel } from '../models/userModel.js';

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
