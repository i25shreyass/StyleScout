import mongoose from 'mongoose';

// One row per product per fetch. Builds price history over time for charts and "genuine deal" checks.
const schema = new mongoose.Schema({
  productKey: { type: String, index: true },
  title: String,
  store: String,
  price: Number,
  delivery: Number, // null when unknown
  query: String,
  at: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('PriceSnapshot', schema);
