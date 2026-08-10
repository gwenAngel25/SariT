const crypto = require('crypto');
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['cash', 'gcash', 'other_ewallet'],
    required: true
  },

  // --- B4: Cryptographic QR Service ---
  signature: {
    type: String,
    required: true
    // SHA-256 hash — mao ni ang "proof" nga i-encode sa QR code para sa customer
  },
  signaturePayload: {
    type: String,
    required: true
    // ang raw string nga gi-hash (orderId + amount + timestamp + secret) — gi-store para ma-re-verify unya
  },

  // --- Verification tracking (Admin's Fraud/Verification Log - A5) ---
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'duplicate_attempt'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
    // ang cashier account nga ni-scan/ni-verify
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verificationAttempts: {
    type: Number,
    default: 0
    // ma-increment matag scan — kung sobra sa 1x successful verify, mag-flag isip duplicate_attempt
  }
}, { timestamps: true });

// --- Static method: mag-generate og signed QR payload sa payment claim time (C7) ---
transactionSchema.statics.generateSignature = function (orderId, amount) {
  const secret = process.env.QR_SIGNING_SECRET || 'saritrack-dev-secret';
  const timestamp = Date.now();
  const payload = `${orderId}|${amount}|${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return { signature, signaturePayload: payload, timestamp };
};

// --- Instance method: mag-verify sa QR pag-scan sa cashier (M6) ---
transactionSchema.methods.verify = function (submittedSignature, cashierId) {
  this.verificationAttempts += 1;

  const secret = process.env.QR_SIGNING_SECRET || 'saritrack-dev-secret';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(this.signaturePayload)
    .digest('hex');

  if (this.verificationStatus === 'verified') {
    this.verificationStatus = 'duplicate_attempt';
    // gi-scan na ni siya kaniadto — gi-block ang reuse (anti-fraud, sama sa gihisgutan sa problem statement)
  } else if (submittedSignature === expectedSignature) {
    this.verificationStatus = 'verified';
    this.verifiedBy = cashierId;
    this.verifiedAt = new Date();
  } else {
    this.verificationStatus = 'failed';
  }

  return this.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);