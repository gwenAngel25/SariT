// Run inside Docker: docker-compose exec backend node src/scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://database:27017/saritrack';

async function createAdmin() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const name = 'Store Admin';
  const contactNumber = '09000000000';
  const password = 'admin123';

  const existing = await User.findOne({ contactNumber });
  if (existing) {
    console.log('⚠️ Admin already exists with this contact number');
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name,
    contactNumber,
    passwordHash,
    role: 'admin',
  });

  console.log('✅ Admin created:');
  console.log('   Contact: ', contactNumber);
  console.log('   Password:', password);
  console.log('   ID:      ', admin._id.toString());

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});