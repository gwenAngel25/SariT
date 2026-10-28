const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    unique: true
    // used for login (customers, cashiers) + Suki tracking
  },
  role: {
    type: String,
    enum: ['admin', 'cashier', 'customer'],
    default: 'customer',
    required: true
  },
  passwordHash: {
    type: String,
    required: function () {
      return this.role === 'admin' || this.role === 'cashier' || this.role === 'customer';
      // all roles now need a password (customer auth required)
    }
  },
  // --- Customer-specific fields ---
  gmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  location: {
    type: String,
    trim: true,
    default: null
  },
  age: {
    type: Number,
    min: 0,
    max: 120,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);