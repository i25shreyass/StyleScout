import { Router } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import Alert from '../models/Alert.js';
import auth from '../middleware/auth.js';
import { runAlertCheck } from '../services/alertChecker.js';
import { normalise } from '../services/shopping.js';

const router = Router();
const nonNegativeNumber = (value) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const safeUrl = (value) => {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
const cronKeyMatches = (provided, expected) => {
  const suppliedHash = createHash('sha256').update(String(provided ?? '')).digest();
  const expectedHash = createHash('sha256').update(String(expected ?? '')).digest();
  return timingSafeEqual(suppliedHash, expectedHash) && Boolean(provided) && Boolean(expected);
};

// Cron endpoint is intentionally outside bearer-authenticated CRUD routes.
router.post('/run-check', async (req, res) => {
  const expected = process.env.CRON_KEY;
  if (!expected) return res.status(503).json({ message: 'Alert checks are not configured.' });
  if (!cronKeyMatches(req.get('x-cron-key'), expected)) return res.status(401).json({ message: 'Invalid cron key.' });
  try {
    return res.json(await runAlertCheck());
  } catch (error) {
    console.error('Price alert check failed:', error.message);
    return res.status(500).json({ message: 'Could not run the price alert check.' });
  }
});

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const alerts = await Alert.find({ user: req.user.id }).select('-notificationClaim -notificationClaimedAt').sort({ createdAt: -1 }).lean();
    res.json(alerts);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const product = req.body?.product;
    const query = normalise(req.body?.query);
    const targetPrice = nonNegativeNumber(req.body?.targetPrice);
    const productKey = String(product?.productKey || product?.id || '').trim();
    const title = String(product?.title || '').trim();
    const price = nonNegativeNumber(product?.price);
    if (!product || !productKey || productKey.length > 200 || !title || title.length > 500 || !query || query.length < 2 || query.length > 200 || query === 'photo' || price === null || targetPrice === null) {
      return res.status(400).json({ message: 'Provide a valid product, search query, and non-negative target price.' });
    }
    const alert = await Alert.create({
      user: req.user.id,
      productKey,
      title,
      store: String(product.store || '').slice(0, 160),
      url: safeUrl(product.url),
      image: safeUrl(product.image),
      query,
      targetPrice,
      lastPrice: price,
      active: true,
    });
    res.status(201).json(alert);
    runAlertCheck().catch((e) => console.warn('instant alert check failed:', e.message)); // check right away, in the background
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = req.body || {};
    const keys = Object.keys(body);
    if (!keys.length || keys.some((key) => !['targetPrice', 'active'].includes(key))) {
      return res.status(400).json({ message: 'Only targetPrice and active can be updated.' });
    }
    const update = {};
    if (Object.hasOwn(body, 'targetPrice')) {
      const targetPrice = nonNegativeNumber(body.targetPrice);
      if (targetPrice === null) return res.status(400).json({ message: 'Target price must be a non-negative number.' });
      update.targetPrice = targetPrice;
    }
    if (Object.hasOwn(body, 'active')) {
      if (typeof body.active !== 'boolean') return res.status(400).json({ message: 'Active must be true or false.' });
      update.active = body.active;
    }
    const alert = await Alert.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: update }, { new: true, runValidators: true }).select('-notificationClaim -notificationClaimedAt');
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    res.json(alert);
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Alert.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ message: 'Alert not found.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
