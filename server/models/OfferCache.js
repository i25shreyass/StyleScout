import mongoose from 'mongoose';

// All sellers for one Google Shopping product, fetched with ONE search and reused for 24 h.
// Clicking "view at store" or opening "all stores" for that product is then free.
const schema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },   // Google product id, or t-<hash of token>
  v: { type: Number, default: 1 },                              // 2 = full seller details (Sprint 6)
  sellers: { type: Array, default: [] },
  fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.model('OfferCache', schema);
