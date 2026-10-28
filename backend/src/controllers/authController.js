// ============================================================
// Auth Controller
// Handles login for Admin, Cashier, and Customer.
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'saritrack-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

exports.registerCustomer = async (req, res) => {
  try {
    const { name, contactNumber, password } = req.body;

    if (!name || !contactNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, contact number, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ contactNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Contact number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      contactNumber,
      passwordHash,
      role: 'customer',
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, role: user.role }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { contactNumber, password, role } = req.body;

    if (!contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'Contact number and password are required' });
    }

    const filter = { contactNumber };
    if (role) filter.role = role;
    const user = await User.findOne(filter);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'This account has no password set' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, role: user.role, contactNumber: user.contactNumber }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, contactNumber, password, role } = req.body;

    if (!name || !contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'Name, contact number, and password required' });
    }

    if (!['cashier', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be cashier or admin' });
    }

    const existing = await User.findOne({ contactNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Contact number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, contactNumber, passwordHash, role });

    res.status(201).json({
      success: true,
      data: { id: user._id, name: user.name, role: user.role, contactNumber: user.contactNumber }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create staff', error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: err.message });
  }
};