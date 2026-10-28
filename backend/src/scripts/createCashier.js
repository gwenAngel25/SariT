// Run: docker-compose exec backend node src/scripts/createCashier.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://database:27017/saritrack';

async function createCashier() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const name = 'Maria Santos';
  const contactNumber = '09171111111';
  const password = 'cashier123';

  const existing = await User.findOne({ contactNumber });
  if (existing) {
    console.log('⚠️ Cashier already exists');
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, contactNumber, passwordHash, role: 'cashier' });

  console.log('✅ Cashier created:');
  console.log('   Name:     ', name);
  console.log('   Contact:  ', contactNumber);
  console.log('   Password: ', password);

  await mongoose.disconnect();
  process.exit(0);
}

createCashier().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});