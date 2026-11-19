import mongoose from 'mongoose';

// Real products shown on the homepage, by category. Filled by `npm run featured` (about 10 searches),
// kept until the next refresh (not the 12-hour search cache).
const schema = new mongoose.Schema({
  query: { type: String, required: true, unique: true },
  category: { type: String, required: true, index: true },
  results: { type: Array, default: [] },
  fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Featured', schema);
