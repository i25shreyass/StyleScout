import { Router } from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const r = Router();
r.use(auth);

const clean = (v) => String(v || '').trim().slice(0, 12);

// GET /api/profile/sizes -> { top, bottom, shoe }
r.get('/sizes', async (req, res) => {
  const u = await User.findById(req.user.id).select('sizes').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(u.sizes || { top: '', bottom: '', shoe: '' });
});

// PUT /api/profile/sizes { top, bottom, shoe }
r.put('/sizes', async (req, res) => {
  const sizes = { top: clean(req.body?.top), bottom: clean(req.body?.bottom), shoe: clean(req.body?.shoe) };
  const u = await User.findByIdAndUpdate(req.user.id, { sizes }, { new: true }).select('sizes').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(u.sizes);
});

export default r;
