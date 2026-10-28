const express = require('express');
const router = express.Router();
const { getStoreInfo, getStoreQR } = require('../controllers/storeController');

// Public — no auth needed
router.get('/info', getStoreInfo);
router.get('/qr', getStoreQR);

module.exports = router;