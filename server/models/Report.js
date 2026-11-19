import mongoose from 'mongoose';

// "Report wrong match or price" from shoppers, so the team can see where matching goes wrong.
const schema = new mongoose.Schema({
  reason: { type: String, enum: ['wrong item', 'wrong price', 'broken link', 'size info wrong', 'other'], required: true },
  note: { type: String, maxlength: 300 },
  productId: { type: String, maxlength: 80 },
  title: { type: String, maxlength: 200 },
  store: { type: String, maxlength: 80 },
  url: { type: String, maxlength: 2000 },
  price: Number,
  at: { type: Date, default: Date.now },
});

export default mongoose.model('Report', schema);
