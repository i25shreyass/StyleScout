import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    country: { type: String, default: 'India' },
    currency: { type: String, default: 'INR' },

    // "My size" picker (Sprint 4): e.g. { top: 'M', bottom: '32', shoe: 'UK 9' }
    sizes: {
      top: { type: String, default: '' },
      bottom: { type: String, default: '' },
      shoe: { type: String, default: '' },
    },

    // Style Passport (all optional, editable and deletable by the user).
    passport: {
      onboarded: { type: Boolean, default: false },      // finished or skipped the welcome step
      shoppingFor: { type: [String], default: [] },       // women | men | unisex | kids
      ageRange: { type: String, default: '' },            // under-18 | 18-24 | 25-34 | 35-44 | 45+
      budget: { type: String, default: '' },              // u1k | 1-2.5k | 2.5-5k | 5k+
      styles: { type: [String], default: [] },            // y2k, streetwear, casual, ...
      colours: { type: [String], default: [] },
      stores: { type: [String], default: [] },
      brands: { type: [String], default: [] },
      keepHistory: { type: Boolean, default: true },      // save my searches
      priceAlertEmails: { type: Boolean, default: true },
      newsEmails: { type: Boolean, default: false },      // marketing: off unless the user opts in
    },

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
