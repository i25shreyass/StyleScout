import { Router } from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import SearchHistory from '../models/SearchHistory.js';

const r = Router();
r.use(auth);

const clean = (v, max = 40) => String(v ?? '').trim().slice(0, max);
// Only accept values from these lists, so the profile can't be filled with junk.
const ALLOWED = {
  shoppingFor: ['women', 'men', 'unisex', 'kids'],
  ageRange: ['', 'under-18', '18-24', '25-34', '35-44', '45+'],
  budget: ['', 'u1k', '1-2.5k', '2.5-5k', '5k+'],
  styles: ['y2k', 'streetwear', 'casual', 'formal', 'ethnic', 'minimal', 'athleisure', 'boho', 'vintage', 'party'],
  colours: ['black', 'white', 'blue', 'pink', 'red', 'green', 'beige', 'brown', 'grey', 'purple', 'yellow', 'orange'],
  stores: ['myntra', 'ajio', 'amazon', 'flipkart', 'h&m', 'zara', 'nykaa fashion', 'tata cliq', 'snitch', 'bewakoof', 'souled store', 'meesho'],
};
const pickList = (v, list, max = 12) => [...new Set([].concat(v || []).map((x) => clean(x).toLowerCase()))].filter((x) => list.includes(x)).slice(0, max);

const view = (u) => ({
  name: u.name,
  email: u.email,
  sizes: u.sizes || { top: '', bottom: '', shoe: '' },
  passport: u.passport || {},
});

// GET /api/profile -> { name, email, sizes, passport }
r.get('/', async (req, res) => {
  const u = await User.findById(req.user.id).select('name email sizes passport').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(view(u));
});

// PUT /api/profile { name?, sizes?, passport? }  (partial updates allowed)
r.put('/', async (req, res) => {
  const b = req.body || {};
  const set = {};
  if (b.name !== undefined) {
    const name = clean(b.name, 60);
    if (!name) return res.status(400).json({ message: 'Name cannot be empty.' });
    set.name = name;
  }
  if (b.sizes) for (const k of ['top', 'bottom', 'shoe']) if (b.sizes[k] !== undefined) set[`sizes.${k}`] = clean(b.sizes[k], 12);
  const p = b.passport || {};
  if (p.onboarded !== undefined) set['passport.onboarded'] = Boolean(p.onboarded);
  if (p.shoppingFor !== undefined) set['passport.shoppingFor'] = pickList(p.shoppingFor, ALLOWED.shoppingFor, 4);
  if (p.ageRange !== undefined && ALLOWED.ageRange.includes(p.ageRange)) set['passport.ageRange'] = p.ageRange;
  if (p.budget !== undefined && ALLOWED.budget.includes(p.budget)) set['passport.budget'] = p.budget;
  if (p.styles !== undefined) set['passport.styles'] = pickList(p.styles, ALLOWED.styles);
  if (p.colours !== undefined) set['passport.colours'] = pickList(p.colours, ALLOWED.colours);
  if (p.stores !== undefined) set['passport.stores'] = pickList(p.stores, ALLOWED.stores);
  if (p.brands !== undefined) set['passport.brands'] = [...new Set([].concat(p.brands || []).map((x) => clean(x, 30)).filter(Boolean))].slice(0, 10);
  for (const k of ['keepHistory', 'priceAlertEmails', 'newsEmails']) if (p[k] !== undefined) set[`passport.${k}`] = Boolean(p[k]);
  if (set['passport.keepHistory'] === false) await SearchHistory.deleteMany({ user: req.user.id }); // turning history off also clears it

  const u = await User.findByIdAndUpdate(req.user.id, { $set: set }, { new: true }).select('name email sizes passport').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(view(u));
});

// DELETE /api/profile/data -> wipes sizes, passport and search history (keeps the login itself)
r.delete('/data', async (req, res) => {
  await SearchHistory.deleteMany({ user: req.user.id });
  const u = await User.findByIdAndUpdate(req.user.id, {
    $set: { sizes: { top: '', bottom: '', shoe: '' }, passport: { onboarded: true } },
  }, { new: true }).select('name email sizes passport').lean();
  res.json(view(u));
});

// Older size-only endpoints (used by the size picker).
r.get('/sizes', async (req, res) => {
  const u = await User.findById(req.user.id).select('sizes').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(u.sizes || { top: '', bottom: '', shoe: '' });
});
r.put('/sizes', async (req, res) => {
  const sizes = { top: clean(req.body?.top, 12), bottom: clean(req.body?.bottom, 12), shoe: clean(req.body?.shoe, 12) };
  const u = await User.findByIdAndUpdate(req.user.id, { sizes }, { new: true }).select('sizes').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(u.sizes);
});

// ---------- search history ----------
// GET /api/profile/history -> latest 40 searches
r.get('/history', async (req, res) => {
  const rows = await SearchHistory.find({ user: req.user.id }).sort({ at: -1 }).limit(40).lean();
  res.json(rows.map((x) => ({ id: x._id, query: x.query, kind: x.kind, link: x.link, results: x.results, at: x.at })));
});

// POST /api/profile/history { query, kind, link?, results? }
r.post('/history', async (req, res) => {
  const u = await User.findById(req.user.id).select('passport.keepHistory').lean();
  if (!u) return res.status(404).json({ message: 'Account not found' });
  if (u.passport?.keepHistory === false) return res.json({ saved: false });
  const query = clean(req.body?.query, 200);
  if (!query) return res.status(400).json({ message: 'Missing search' });
  const kind = ['text', 'link', 'photo'].includes(req.body?.kind) ? req.body.kind : 'text';
  const link = kind === 'link' ? clean(req.body?.link, 2000) : undefined;
  // same search again within 30 min just updates its time
  const recent = await SearchHistory.findOne({ user: req.user.id, query, kind, at: { $gt: new Date(Date.now() - 30 * 60_000) } });
  if (recent) { recent.at = new Date(); recent.results = Number(req.body?.results) || recent.results; await recent.save(); }
  else await SearchHistory.create({ user: req.user.id, query, kind, link, results: Number(req.body?.results) || 0 });
  // keep at most 200 per user
  const extra = await SearchHistory.find({ user: req.user.id }).sort({ at: -1 }).skip(200).select('_id').lean();
  if (extra.length) await SearchHistory.deleteMany({ _id: { $in: extra.map((x) => x._id) } });
  res.json({ saved: true });
});

r.delete('/history/:id', async (req, res) => {
  await SearchHistory.deleteOne({ _id: req.params.id, user: req.user.id }).catch(() => null);
  res.status(204).end();
});
r.delete('/history', async (req, res) => {
  await SearchHistory.deleteMany({ user: req.user.id });
  res.status(204).end();
});

export default r;
