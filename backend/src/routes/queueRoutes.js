const express = require('express');
const router = express.Router();
const { getQueue, callCustomer, removeFromQueue } = require('../controllers/queueController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/', requireAuth, requireRole('cashier', 'admin'), getQueue);
router.patch('/:orderId/call', requireAuth, requireRole('cashier', 'admin'), callCustomer);
router.delete('/:orderId', requireAuth, requireRole('cashier', 'admin'), removeFromQueue);

module.exports = router;