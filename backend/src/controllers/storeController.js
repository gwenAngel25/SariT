// ============================================================
// Store Controller
// Returns store profile + generates QR code for storefront.
// ============================================================
const QRCode = require('qrcode');
const store = require('../config/store');

// ------------------------------------------------------------
// GET /api/store/info — public endpoint
// Customers use this to see which store they scanned into.
// ------------------------------------------------------------
exports.getStoreInfo = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      storeName: store.storeName,
      latitude: store.latitude,
      longitude: store.longitude,
      geofenceRadiusMeters: store.geofenceRadiusMeters,
    },
  });
};

// ------------------------------------------------------------
// GET /api/store/qr — returns QR image (PNG)
// Admin prints this and posts it at the store front door.
// The QR encodes the URL: <baseUrl>/scan?store=<storeId>
// ------------------------------------------------------------
exports.getStoreQR = async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || `${req.protocol}://${req.get('host')}`;
    const scanUrl = `${baseUrl}/scan?store=main`;

    const dataUrl = await QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0B3D2E',   // SariTrack dark green
        light: '#FFFFFF',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        scanUrl,
        qrDataUrl: dataUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate QR', error: err.message });
  }
};