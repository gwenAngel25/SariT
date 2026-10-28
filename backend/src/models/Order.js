const mongoose = require('mongoose');

// --- Sub-document: individual line item sa order ---
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
    // snapshot sa product name at the time of order — dili apektado kung mausab ang product unya
  },
  price: {
    type: Number,
    required: true
    // snapshot sa price pud, para dili apektado ang naunang orders kung mag-usab ang presyo sa Admin
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    required: true,
    unique: true
    // e.g. "SRT-00482" — human-readable reference, gigamit sa Cashier dashboard mockup
  },
  customer: {
    name: { type: String, required: true },
    contactNumber: { type: String, required: true }
  },
  items: {
    type: [orderItemSchema],
    validate: [arr => arr.length > 0, 'Order must have at least one item']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // --- C4: Geofence-Gated Ordering ---
  geofence: {
    verified: { type: Boolean, default: false },
    distanceMeters: { type: Number, default: null },
    verifiedAt: { type: Date, default: null }
  },

  // --- Order lifecycle status (C8: Order Status Notifications) ---
  status: {
    type: String,
    enum: [
      'staged_pending',   // order placed remotely, waiting for geofence entry
      'queued',            // inside geofence, active in FIFO queue
      'staging',            // cashier is picking/packing items
      'ready_for_pickup',   // staged & waiting for customer to be called
      'paid',
      'completed',                // payment verified, transaction complete
      'cancelled'
    ],
    default: 'staged_pending'
  },

  // --- M1: Live FIFO Queue / priority support ---
  queue: {
    position: { type: Number, default: null },
    priority: { type: Boolean, default: false },
    calledAt: { type: Date, default: null }
  },

  // --- Handover Lock (Step 6) ---
releasedAt: {
  type: Date,
  default: null,
  // null = not yet released to customer
  // timestamp = items handed over at this time
},
releasedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null,
  // the cashier who released the items
},


  // --- Payment reference (M6: Cryptographic QR Verification) ---
  paymentMethod: {
    type: String,
    enum: ['cash', 'gcash', 'other_ewallet'],
    default: null
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  }
}, { timestamps: true });

// --- Index para paspas ang pag-query sa active queue (Cashier dashboard) ---
orderSchema.index({ status: 1, 'queue.position': 1 });

module.exports = mongoose.model('Order', orderSchema);