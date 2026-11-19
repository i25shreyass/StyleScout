import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productKey: { type: String, required: true, trim: true },
  title: { type: String, required: true },
  store: { type: String, default: '' },
  url: { type: String, default: '' },
  image: { type: String, default: '' },
  query: { type: String, default: '' },
  savedPrice: { type: Number, required: true, min: 0 },
  savedAt: { type: Date, default: Date.now },
});

schema.index({ user: 1, productKey: 1 }, { unique: true });

export default mongoose.model('WishlistItem', schema);
