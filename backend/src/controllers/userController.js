import { User } from '../models/User.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, username, mobile, password, role } = req.body;

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      mobile,
      password,
      role: role || 'cashier'
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_USER',
      module: 'USERS',
      recordId: user._id,
      details: `Created staff user "${user.username}" with role "${user.role}"`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
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

export const updateUser = async (req, res) => {
  try {
    const { name, mobile, role, status, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) user.password = password;

    await user.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_USER',
      module: 'USERS',
      recordId: user._id,
      details: `Updated user "${user.username}"`,
      req
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
