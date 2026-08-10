const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  category: {
    type: String,
    enum: ['Beverages', 'Snacks', 'Instant Food', 'E-Load', 'Household', 'Personal Care', 'Others'],
    default: 'Others'
  },
  photoUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
    // false = hidden from customer catalog (e.g., temporarily out of stock, discontinued)
  },
  lowStockThreshold: {
    type: Number,
    default: 10
    // used by Admin Panel (A4) to flag "Low Stock" status, sama sa gipakita sa mockup
  }
}, { timestamps: true });

// --- Virtual field: auto-computed status, dili nato i-store sa DB, gina-compute ra ---
productSchema.virtual('status').get(function () {
  if (!this.isActive) return 'inactive';
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.lowStockThreshold) return 'low_stock';
  return 'active';
});

productSchema.set('toJSON', { virtuals: true });

// --- Instance method: gamiton sa Order processing (M7 - Automatic Inventory Deduction) ---
productSchema.methods.deductStock = async function (quantity) {
  if (this.stock < quantity) {
    throw new Error(`Insufficient stock for ${this.name}. Available: ${this.stock}, Requested: ${quantity}`);
  }
  this.stock -= quantity;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);