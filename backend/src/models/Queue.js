const mongoose = require('mongoose');

// --- Usa lang ka "active queue state" per store, gi-update in-place (dili mag-daghan og records) ---
const queueEntrySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderCode: {
    type: String,
    required: true
    // duplicated gikan sa Order para paspas i-display sa Cashier dashboard nga walay extra lookup
  },
  customerName: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  priority: {
    type: Boolean,
    default: false
  },
  enteredQueueAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const queueSchema = new mongoose.Schema({
  storeId: {
    type: String,
    required: true,
    default: 'main'
    // e.g. useful kung mo-scale unya sa multiple branches; usa ra ka store karon
  },
  entries: {
    type: [queueEntrySchema],
    default: []
  },
  lastCalledPosition: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// --- Instance method: mag-recalculate sa FIFO order (priority orders una, dayon by time) ---
queueSchema.methods.reorder = function () {
  this.entries.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.enteredQueueAt - b.enteredQueueAt;
  });
  this.entries.forEach((entry, index) => {
    entry.position = index + 1;
  });
  return this.save();
};

// --- Instance method: tangtangon ang order sa queue human ma-call/ma-serve (M3) ---
queueSchema.methods.removeOrder = function (orderId) {
  this.entries = this.entries.filter(e => e.order.toString() !== orderId.toString());
  return this.reorder();
};

module.exports = mongoose.model('Queue', queueSchema);