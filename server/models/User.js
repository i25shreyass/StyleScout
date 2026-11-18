import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    country: { type: String, default: 'India' },
    currency: { type: String, default: 'INR' },

    // Email verification. Only a SHA-256 hash of the emailed token is stored.
    emailVerified: { type: Boolean, default: false },
    verifyTokenHash: { type: String },
    verifyTokenExpires: { type: Date },

    // Password reset (same idea: hash only, short expiry).
    resetTokenHash: { type: String },
    resetTokenExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', schema);
