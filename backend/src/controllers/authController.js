import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logAudit } from '../middleware/auditLogger.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dress_shop_super_secret_jwt_key_2026_local', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive user account' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    await logAudit({
      user,
      action: 'LOGIN',
      module: 'AUTH',
      details: `User ${user.username} logged in successfully`,
      req
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        mobile: user.mobile
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
        mobile: req.user.mobile
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      user,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      details: 'Password changed successfully',
      req
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
