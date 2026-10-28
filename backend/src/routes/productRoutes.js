const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Public — customers can browse
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Admin-only
router.post('/', requireAuth, requireRole('admin'), createProduct);
router.put('/:id', requireAuth, requireRole('admin'), updateProduct);
router.delete('/:id', requireAuth, requireRole('admin'), deleteProduct);
router.patch('/:id/stock', requireAuth, requireRole('admin'), adjustStock);

module.exports = router;