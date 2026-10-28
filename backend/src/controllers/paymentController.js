// ============================================================
// Payment Controller
// Handles cash payment confirmation + automatic inventory deduction.
// ============================================================
const Order = require('../models/Order');
const Product = require('../models/Product');
const Queue = require('../models/Queue');
const { getIO } = require('../socket');

// ------------------------------------------------------------
// POST /api/payments/cash
// Body: { orderId, cashTendered }
// Auth: Cashier or Admin
// ------------------------------------------------------------
exports.processCashPayment = async (req, res) => {
  try {
    const { orderId, cashTendered } = req.body;

    if (!orderId || cashTendered === undefined) {
      return res.status(400).json({ success: false, message: 'orderId and cashTendered are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['staging', 'ready_for_pickup'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for order with status: ${order.status}`
      });
    }

    const cash = Number(cashTendered);
    if (isNaN(cash) || cash < order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient cash. Required: ₱${order.totalAmount.toFixed(2)}, Received: ₱${cash.toFixed(2)}`
      });
    }

    const change = cash - order.totalAmount;

    // --- Update order ---
    order.status = 'paid';
    order.paymentMethod = 'cash';
    order.queue.position = null;
    await order.save();

    // --- Remove from queue ---
    const queue = await Queue.findOne({ storeId: 'main' });
    if (queue) {
      await queue.removeOrder(order._id);
    }

    // --- Deduct inventory ---
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        try {
          await product.deductStock(item.quantity);
        } catch (err) {
          console.error(`Stock deduction failed for ${product.name}:`, err.message);
        }
      }
    }

    // --- Real-time broadcasts ---
    const io = getIO();

    io.to(`order:${order._id}`).emit('order:updated', {
      _id: order._id,
      orderCode: order.orderCode,
      status: order.status,
      paymentMethod: order.paymentMethod,
    });

    const updatedQueue = await Queue.findOne({ storeId: 'main' });
    io.to('queue:main').emit('queue:updated', updatedQueue);

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderCode: order.orderCode,
          customerName: order.customer.name,
          items: order.items,
          totalAmount: order.totalAmount,
          status: order.status,
          paidAt: new Date(),
        },
        cashTendered: cash,
        change: change,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payment failed', error: err.message });
  }
};

// ============================================================
// CRYPTOGRAPHIC QR VERIFICATION (Step 5)
// ============================================================
const crypto = require('crypto');
const Transaction = require('../models/Transaction');

const QR_SECRET = process.env.QR_SIGNING_SECRET || 'saritrack-dev-secret';
const QR_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Helper: sign a payload with HMAC-SHA256
function signPayload(payload) {
  return crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');
}

// ------------------------------------------------------------
// POST /api/payments/qr/generate
// Customer submits GCash claim → gets signed QR payload
// Body: { orderId, referenceNumber, method }
// ------------------------------------------------------------
exports.generatePaymentQR = async (req, res) => {
  try {
    const { orderId, referenceNumber, method = 'gcash' } = req.body;

    if (!orderId || !referenceNumber) {
      return res.status(400).json({ success: false, message: 'orderId and referenceNumber are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    // Build the signed payload: orderId|amount|timestamp
    const timestamp = Date.now();
    const payload = `${order._id}|${order.totalAmount}|${timestamp}`;
    const signature = signPayload(payload);
    const qrData = `${payload}|${signature}`;

    // Save transaction record
    const transaction = await Transaction.create({
      order: order._id,
      amount: order.totalAmount,
      method,
      signature,
      signaturePayload: payload,
      verificationStatus: 'pending',
    });

    // Update order
    order.paymentMethod = method;
    order.transaction = transaction._id;
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        transactionId: transaction._id,
        orderId: order._id,
        orderCode: order.orderCode,
        amount: order.totalAmount,
        referenceNumber,
        qrData,           // the full string cashier will verify
        signature,        // for display
        expiresAt: new Date(timestamp + QR_EXPIRY_MS),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate QR', error: err.message });
  }
};

// ------------------------------------------------------------
// POST /api/payments/qr/verify
// Cashier submits the code string → system verifies signature
// Body: { qrData }
// Auth: Cashier/Admin
// ------------------------------------------------------------
exports.verifyPaymentQR = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ success: false, message: 'qrData is required' });
    }

    // Parse: orderId|amount|timestamp|signature
    const parts = qrData.split('|');
    if (parts.length !== 4) {
      return res.status(400).json({ success: false, message: 'Invalid QR format' });
    }

    const [orderId, amountStr, timestampStr, submittedSignature] = parts;
    const amount = Number(amountStr);
    const timestamp = Number(timestampStr);

    // 1. Re-sign the payload and compare
    const expectedPayload = `${orderId}|${amountStr}|${timestampStr}`;
    const expectedSignature = signPayload(expectedPayload);

    if (submittedSignature !== expectedSignature) {
      // Log fraud
      await Transaction.create({
        order: orderId,
        amount,
        method: 'gcash',
        signature: submittedSignature,
        signaturePayload: expectedPayload,
        verificationStatus: 'failed',
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
      });
      return res.status(400).json({ success: false, message: 'Invalid signature — payment is forged' });
    }

    // 2. Check timestamp (expired?)
    if (Date.now() - timestamp > QR_EXPIRY_MS) {
      return res.status(400).json({ success: false, message: 'QR code has expired' });
    }

    // 3. Find the transaction
    const transaction = await Transaction.findOne({ signature: submittedSignature });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // 4. Check replay
    if (transaction.verificationStatus === 'verified') {
      transaction.verificationStatus = 'duplicate_attempt';
      transaction.verificationAttempts += 1;
      await transaction.save();
      return res.status(400).json({ success: false, message: 'QR code has already been used (replay detected)' });
    }

    // 5. Find the order and check amount
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (Math.abs(order.totalAmount - amount) > 0.01) {
      transaction.verificationStatus = 'failed';
      await transaction.save();
      return res.status(400).json({ success: false, message: 'Amount mismatch' });
    }

    // --- All checks passed ---
    transaction.verificationStatus = 'verified';
    transaction.verifiedBy = req.user.id;
    transaction.verifiedAt = new Date();
    transaction.verificationAttempts += 1;
    await transaction.save();

    order.status = 'paid';
    order.queue.position = null;
    await order.save();

    // Remove from queue
    const queue = await Queue.findOne({ storeId: 'main' });
    if (queue) await queue.removeOrder(order._id);

    // Deduct inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        try { await product.deductStock(item.quantity); } catch (e) { console.error(e.message); }
      }
    }

    // Real-time broadcasts
    const io = getIO();
    io.to(`order:${order._id}`).emit('order:updated', {
      _id: order._id, orderCode: order.orderCode, status: 'paid',
    });
    const updatedQueue = await Queue.findOne({ storeId: 'main' });
    io.to('queue:main').emit('queue:updated', updatedQueue);

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderCode: order.orderCode,
          customerName: order.customer.name,
          amount: order.totalAmount,
          status: 'paid',
        },
        verifiedAt: transaction.verifiedAt,
        method: transaction.method,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
};