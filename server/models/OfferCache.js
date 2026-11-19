import mongoose from 'mongoose';

// All sellers (and product facts) for one Google Shopping product, fetched with ONE search and reused for 24 h.
const schema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },   // Google product id, or t-<hash of token>
  v: { type: Number, default: 1 },                              // 2 = full seller details, 3 = + product facts
  sellers: { type: Array, default: [] },
  product: { type: mongoose.Schema.Types.Mixed, default: null },
  fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.model('OfferCache', schema);
