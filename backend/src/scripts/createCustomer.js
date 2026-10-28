// Run: docker-compose exec backend node src/scripts/createCustomer.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://database:27017/saritrack';

async function createCustomer() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // --- Customer details ---
  const name = 'Pedro Reyes';
  const contactNumber = '09201234567';
  const gmail = 'pedro.reyes@gmail.com';
  const location = 'Barangay San Isidro';
  const age = 28;
  const password = 'pedro123';

  // Check if already exists
  const existing = await User.findOne({ contactNumber });
  if (existing) {
    console.log('⚠️ Customer already exists:');
    console.log('   Name:    ', existing.name);
    console.log('   Contact: ', existing.contactNumber);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    name,
    contactNumber,
    gmail,
    location,
    age,
    passwordHash,
    role: 'customer',
    isActive: true,
  });

  console.log('✅ Customer created:');
  console.log('   ─────────────────────────────');
  console.log('   Full Name:      ', name);
  console.log('   Phone Number:   ', contactNumber);
  console.log('   Gmail:          ', gmail);
  console.log('   Location:       ', location);
  console.log('   Age:            ', age);
  console.log('   Password:       ', password);
  console.log('   Role:           ', 'customer');
  console.log('   ID:             ', user._id.toString());
  console.log('   ─────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

createCustomer().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});