const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  login,
  createStaff,
  getMe,
} = require('../controllers/authController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerCustomer);
router.post('/login', login);

// Protected routes
router.get('/me', requireAuth, getMe);
router.post('/create-staff', requireAuth, requireRole('admin'), createStaff);

module.exports = router;