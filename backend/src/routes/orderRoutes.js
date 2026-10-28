const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  verifyLocation,
  updateOrderStatus,
  releaseOrder,
  
} = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Customer actions
router.post('/', createOrder);
router.patch('/:id/verify-location', verifyLocation);
router.get('/:id', getOrderById);

// Cashier/Admin only
router.get('/', requireAuth, requireRole('cashier', 'admin'), getAllOrders);
router.patch('/:id/status', requireAuth, requireRole('cashier', 'admin'), updateOrderStatus);
router.patch('/:id/choose-payment', choosePayment);
router.post('/:id/release', requireAuth, requireRole('cashier', 'admin'), releaseOrder);

module.exports = router;