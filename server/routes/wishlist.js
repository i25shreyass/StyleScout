import { Router } from 'express';
import WishlistItem from '../models/WishlistItem.js';
import PriceSnapshot from '../models/PriceSnapshot.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const items = await WishlistItem.find({ user: req.user.id }).sort({ savedAt: -1 }).lean();
    const keys = items.map((item) => item.productKey);
    const latest = await PriceSnapshot.aggregate([
      { $match: { productKey: { $in: keys } } },
      { $sort: { at: -1 } },
      { $group: { _id: '$productKey', price: { $first: '$price' } } },
    ]);
    const latestByKey = new Map(latest.map((row) => [row._id, row.price]));
    res.json(items.map((item) => ({ ...item, latestPrice: latestByKey.get(item.productKey) ?? item.savedPrice })));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { productKey, title, store, url, image, query, price } = req.body || {};
    if (!productKey || !title || !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: 'A product key, title, and valid price are required.' });
    }
    const item = await WishlistItem.findOneAndUpdate(
      { user: req.user.id, productKey: String(productKey) },
      { $set: { title, store: store || '', url: url || '', image: image || '', query: query || '', savedPrice: Number(price) }, $setOnInsert: { user: req.user.id, productKey: String(productKey), savedAt: new Date() } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json(item);
  } catch (error) {
    if (error?.code === 11000) {
      try {
        const item = await WishlistItem.findOneAndUpdate({ user: req.user.id, productKey: String(req.body?.productKey) }, { $set: { title: req.body.title, store: req.body.store || '', url: req.body.url || '', image: req.body.image || '', query: req.body.query || '', savedPrice: Number(req.body.price) } }, { new: true, runValidators: true });
        return res.json(item);
      } catch (retryError) { return next(retryError); }
    }
    next(error);
  }
});

router.delete('/:productKey', async (req, res, next) => {
  try {
    await WishlistItem.findOneAndDelete({ user: req.user.id, productKey: req.params.productKey });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
