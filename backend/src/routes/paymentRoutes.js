const express = require('express');
const router = express.Router();
const {
  processCashPayment,
  generatePaymentQR,
  verifyPaymentQR,
} = require('../controllers/paymentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Cashier/Admin only
router.post('/cash', requireAuth, requireRole('cashier', 'admin'), processCashPayment);

// Customer generates QR (no auth needed for guest flow)
router.post('/qr/generate', generatePaymentQR);

// Cashier verifies QR
router.post('/qr/verify', requireAuth, requireRole('cashier', 'admin'), verifyPaymentQR);

module.exports = router;