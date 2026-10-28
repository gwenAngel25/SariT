// ============================================================
// SEED SCRIPT — Para mapuno ang database og mga produkto
// ------------------------------------------------------------
// Unsa ni: Nag-inserter og sample nga mga produkto para sa
//          Aling Nena's Sari-Sari Store (mga tipikal nga barangay
//          store items — snacks, drinks, e-load, etc.)
//
// Kinsa mag-run: ang developer/admin. Dili ni pinaagi sa web app —
//                 script lang siya nga naa sa backend folder.
//
// Giunsa pag-run (inside Docker container):
//     docker compose exec backend node seed.js
//
// Notes:
//   - Dili mag-duplicate kung re-run kay gamit ang `upsert: true`
//     base sa product name (pangitaon na niya daan, kung naa i-ignore).
//   - Gi-skip ang mga products nga naa na (wala na tag bugno sa presyo).
// ============================================================
require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('./src/models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://database:27017/saritrack';

// --- Sample catalog: tipikal nga sud sa sari-sari store sa Bohol ---
// [name, price, stock, category]
const products = [
  // Beverages (ilimnon)
  ['Coke Mismo (500ml)', 20, 40, 'Beverages'],
  ['Sting Energy (500ml)', 25, 30, 'Beverages'],
  ['C2 Cool & Clean (500ml)', 20, 35, 'Beverages'],
  ['Mineral Water (500ml)', 15, 50, 'Beverages'],
  ['Milo Pack (3-in-1)', 15, 20, 'Beverages'],

  // Snacks (panlaman)
  ['Chippy Picks (30g)', 10, 60, 'Snacks'],
  ['Piattos Cheese (30g)', 12, 55, 'Snacks'],
  ['Nova Country Cheddar (30g)', 12, 50, 'Snacks'],
  ['Clover Chips (40g)', 15, 40, 'Snacks'],
  ['Skyflakes (100g)', 18, 45, 'Snacks'],

  // Instant Food (instant noodles, canned goods)
  ['Lucky Me Pancit Canton', 15, 80, 'Instant Food'],
  ['Lucky Me Beef Mami', 15, 75, 'Instant Food'],
  ['CDO Corned Beef (155g)', 58, 25, 'Instant Food'],
  ['Argentina Pork & Beans (120g)', 22, 30, 'Instant Food'],
  ['Datu Puti Soy Sauce (10ml)', 3, 100, 'Instant Food'],

  // E-Load (cellphone loading - denominations)
  ['E-Load 10', 10, 999, 'E-Load'],
  ['E-Load 15', 15, 999, 'E-Load'],
  ['E-Load 20', 20, 999, 'E-Load'],
  ['E-Load 50', 50, 999, 'E-Load'],
  ['E-Load 100', 100, 999, 'E-Load'],

  // Household (panglagar)
  ['Surf Powder (44g)', 8, 70, 'Household'],
  ['Dishwashing Liquid (sachet)', 7, 80, 'Household'],
  ['Zonrox Bleach (125ml)', 25, 40, 'Household'],

  // Personal Care
  ['Safeguard Soap (60g)', 22, 35, 'Personal Care'],
  ['Colgate Toothpaste (45g)', 15, 45, 'Personal Care'],
  ['Head & Shoulders (sachet)', 7, 60, 'Personal Care'],
  ['Palmolive Shampoo (sachet)', 7, 60, 'Personal Care'],

  // Others
  ['Matchstick', 2, 150, 'Others'],
  ['Candle (white)', 5, 100, 'Others'],
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Naka-connect sa MongoDB.');

  let added = 0;
  let skipped = 0;

  for (const [name, price, stock, category] of products) {
    // upsert: kung naa nay pareho nga pangalan, wala na ta mag-usab (skip)
    const result = await Product.updateOne(
      { name },
      { $setOnInsert: { name, price, stock, category, isActive: true, lowStockThreshold: 10 } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      added++;
      console.log(`  + ${name} (₱${price})`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✓ Nahuman! ${added} ka produkto ang nadugang, ${skipped} ang naa na daan (gilaktawan).`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Napaak ang seed:', err);
  process.exit(1);
});