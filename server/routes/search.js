import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { searchProducts, SearchError } from '../services/shopping.js';

const r = Router();

// Protects the monthly search quota from someone hammering the button.
r.use(rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many searches in a minute. Please wait a moment.' },
}));

// GET /api/search?q=black+cargo+pants
r.get('/', async (req, res) => {
  try {
    const out = await searchProducts(req.query.q);
    res.json(out);
  } catch (e) {
    if (e instanceof SearchError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error('Search failed:', e);
    res.status(500).json({ message: 'Search failed. Please try again.' });
  }
});

export default r;
