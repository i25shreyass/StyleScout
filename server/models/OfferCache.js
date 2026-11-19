import mongoose from 'mongoose';

// All sellers for one Google Shopping product, fetched with ONE search and reused for 24 h.
// Clicking "view at store" for any seller of that product is then free.
const schema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  sellers: [{ store: String, url: String, price: Number }],
  fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.model('OfferCache', schema);
