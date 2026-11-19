import mongoose from 'mongoose';

// One row per search by a logged-in user (only when their passport has keepHistory on).
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  query: { type: String, required: true, maxlength: 200 },
  kind: { type: String, enum: ['text', 'link', 'photo'], default: 'text' },
  link: { type: String, maxlength: 2000 },          // the pasted product link, for link searches
  results: { type: Number, default: 0 },
  at: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('SearchHistory', schema);
