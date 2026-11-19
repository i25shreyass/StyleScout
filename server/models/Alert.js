import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productKey: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  store: { type: String, default: '' },
  url: { type: String, default: '' },
  image: { type: String, default: '' },
  query: { type: String, required: true, trim: true },
  targetPrice: { type: Number, required: true, min: 0 },
  lastPrice: { type: Number, min: 0 },
  active: { type: Boolean, default: true },
  lastCheckedAt: { type: Date },
  notifiedAt: { type: Date },
  // A short lease prevents concurrent checkers from sending duplicate emails.
  notificationClaim: { type: String, select: false },
  notificationClaimedAt: { type: Date, select: false },
}, { timestamps: true });

schema.index({ active: 1, query: 1 });

export default mongoose.model('Alert', schema);
