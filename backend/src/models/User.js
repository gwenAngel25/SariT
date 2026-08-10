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
    // used to identify repeat customers (Suki tracking) and staff login
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
      return this.role === 'admin' || this.role === 'cashier';
      // customers don't need accounts/passwords — guest ordering via contactNumber
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);