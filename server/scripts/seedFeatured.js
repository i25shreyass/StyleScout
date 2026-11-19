// Fills the homepage with real products.  Run from the server folder:   npm run featured
// Uses about 10 live searches (fewer if some of these searches were made in the last 12 hours).
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { searchProducts } from '../services/shopping.js';
import { FEATURED } from '../services/featured.js';
import Featured from '../models/Featured.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
let total = 0;
for (const cat of FEATURED) {
  for (const q of cat.queries) {
    try {
      const out = await searchProducts(q);
      await Featured.updateOne({ query: q }, { query: q, category: cat.key, results: out.results, fetchedAt: new Date() }, { upsert: true });
      total += out.results.length;
      console.log(`✓ ${cat.key.padEnd(12)} "${q}" → ${out.results.length} products${out.cached ? ' (from cache, free)' : ''}`);
    } catch (e) {
      console.log(`✗ ${cat.key.padEnd(12)} "${q}" → ${e.message}`);
    }
  }
}
console.log(`\nDone: ${total} products saved for the homepage.`);
await mongoose.disconnect();
