import mongoose from 'mongoose';

// Saved search results, reused so repeat searches don't spend SerpApi quota.
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "text:black cargo pants"
  query: String,
  results: { type: Array, default: [] },
  fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.model('SearchCache', schema);
