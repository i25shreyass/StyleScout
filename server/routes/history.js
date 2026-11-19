import express from 'express';
import PriceSnapshot from '../models/PriceSnapshot.js';

const router = express.Router();

/*
 * GET /api/history/search?q=...
 *
 * Returns the lowest recorded product price for each day
 * for a particular StyleScout search.
 *
 * IMPORTANT:
 * This route must appear before /:productKey because otherwise
 * Express could interpret the word "search" as a productKey.
 */
router.get('/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query) {
      return res.status(400).json({
        error: 'Search query is required.',
      });
    }

    const snapshots = await PriceSnapshot.find({ query })
      .sort({ at: 1 })
      .lean();

    if (!snapshots.length) {
      return res.json({
        query,
        points: [],
        min: null,
        max: null,
        avg: null,
        current: null,
      });
    }

    // Keep only the lowest price seen on each calendar day.
    const lowestByDay = new Map();

    for (const snapshot of snapshots) {
      if (!Number.isFinite(snapshot.price)) continue;

      const day = new Date(snapshot.at).toISOString().slice(0, 10);
      const existing = lowestByDay.get(day);

      if (!existing || snapshot.price < existing.price) {
        lowestByDay.set(day, {
          at: snapshot.at,
          price: snapshot.price,
        });
      }
    }

    const points = [...lowestByDay.values()]
      .sort((a, b) => new Date(a.at) - new Date(b.at))
      .slice(-200);

    const prices = points.map((point) => point.price);

    if (!prices.length) {
      return res.json({
        query,
        points: [],
        min: null,
        max: null,
        avg: null,
        current: null,
      });
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(
      prices.reduce((sum, price) => sum + price, 0) / prices.length
    );
    const current = points[points.length - 1].price;

    return res.json({
      query,
      points,
      min,
      max,
      avg,
      current,
    });
  } catch (error) {
    console.error('Search history error:', error);
    return res.status(500).json({
      error: 'Could not load search price history.',
    });
  }
});

/*
 * GET /api/history/:productKey
 *
 * Returns up to 200 historical prices for one specific product.
 */
router.get('/:productKey', async (req, res) => {
  try {
    const productKey = String(req.params.productKey || '').trim();

    if (!productKey) {
      return res.status(400).json({
        error: 'Product key is required.',
      });
    }

    const snapshots = await PriceSnapshot.find({ productKey })
      .sort({ at: -1 })
      .limit(200)
      .lean();

    if (!snapshots.length) {
      return res.status(404).json({
        error: 'No price history found for this product.',
      });
    }

    // Database query above gets the newest 200 records.
    // Reverse them so the chart runs oldest -> newest.
    snapshots.reverse();

    const validSnapshots = snapshots.filter((snapshot) =>
      Number.isFinite(snapshot.price)
    );

    if (!validSnapshots.length) {
      return res.status(404).json({
        error: 'No valid price history found for this product.',
      });
    }

    const points = validSnapshots.map((snapshot) => ({
      at: snapshot.at,
      price: snapshot.price,
    }));

    const prices = points.map((point) => point.price);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(
      prices.reduce((sum, price) => sum + price, 0) / prices.length
    );
    const current = points[points.length - 1].price;

    const latest = validSnapshots[validSnapshots.length - 1];

    return res.json({
      title: latest.title,
      store: latest.store,
      points,
      min,
      max,
      avg,
      current,
    });
  } catch (error) {
    console.error('Product history error:', error);
    return res.status(500).json({
      error: 'Could not load product price history.',
    });
  }
});

export default router;