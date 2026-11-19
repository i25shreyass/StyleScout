import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import crypto from 'crypto';
import { searchProducts, searchByImage, findStoreLink, getSellers, SearchError } from '../services/shopping.js';
import { readProductLink } from '../services/linkReader.js';
import { readSizes, sizeStatus } from '../services/sizeReader.js';
import Report from '../models/Report.js';

const r = Router();

// ---- photos uploaded for image search are kept in memory for 10 minutes ----
// Google Lens has to download the photo from a public address, so we serve it from here briefly.
const tmpImages = new Map();
const hostImage = (buf, type) => {
  const now = Date.now();
  for (const [k, v] of tmpImages) if (v.exp < now) tmpImages.delete(k);
  const id = crypto.randomBytes(16).toString('hex');
  tmpImages.set(id, { buf, type, exp: now + 10 * 60_000 });
  return id;
};
const sha1 = (x) => crypto.createHash('sha1').update(x).digest('hex');
const publicBase = () => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

// Served before the rate limit so Google can fetch it.
r.get('/tmp/:id', (req, res) => {
  const hit = tmpImages.get(req.params.id);
  if (!hit || hit.exp < Date.now()) return res.status(404).end();
  res.set('Content-Type', hit.type).set('Cache-Control', 'private, max-age=600').send(hit.buf);
});

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
    const out = await searchProducts(req.query.q, { refresh: req.query.refresh === '1' });
    res.json(out);
  } catch (e) {
    if (e instanceof SearchError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error('Search failed:', e);
    res.status(500).json({ message: 'Search failed. Please try again.' });
  }
});

// POST /api/search/link  { url }  -> { query, source }   (free: no search quota used)
r.post('/link', async (req, res) => {
  try {
    res.json(await readProductLink(req.body?.url));
  } catch (e) {
    if (e instanceof SearchError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error('Link read failed:', e);
    res.status(500).json({ message: 'Could not read that link. Try typing the product name instead.' });
  }
});

// POST /api/search/image   multipart "image" (a photo)  OR  JSON { url } (a link to a photo)
// Uses 1 live search (Google Lens). Same photo again within the cache window is free.
r.post('/image', (req, res, next) => upload.single('image')(req, res, (err) => {
  if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'That photo is too big (max 4 MB).' : 'Could not read that photo.', code: 'BAD_IMAGE' });
  next();
}), async (req, res) => {
  try {
    let args;
    if (req.file) {
      args = {
        cacheKey: `img:${sha1(req.file.buffer)}`,
        getImageUrl: () => {
          const base = publicBase();
          if (!base) throw new SearchError('Photo upload only works on the live site, because Google has to be able to reach the photo. While testing on your computer, paste a link to a photo instead.', 400, 'LOCAL_UPLOAD');
          return `${base}/api/search/tmp/${hostImage(req.file.buffer, req.file.mimetype)}`;
        },
      };
    } else {
      const url = String(req.body?.url || '').trim();
      if (!/^https?:\/\/\S+$/i.test(url)) throw new SearchError('Paste a full link to a photo (starting with https://).', 400, 'BAD_IMAGE');
      args = { cacheKey: `img:${sha1(url)}`, getImageUrl: () => url };
    }
    res.json(await searchByImage(args));
  } catch (e) {
    if (e instanceof SearchError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error('Image search failed:', e);
    res.status(500).json({ message: 'Photo search failed. Please try again.' });
  }
});

// GET /api/search/offer?productId=g-123&store=Myntra&fallback=<google link>
// Returns { url } = the store's own page when we can find it, otherwise the fallback link.
r.get('/offer', async (req, res) => {
  const rawId = String(req.query.productId || '');
  const productId = rawId.startsWith('g-') ? rawId.slice(2) : '';   // only real Google product ids
  const store = String(req.query.store || '');
  const token = String(req.query.token || '').slice(0, 8000) || null;
  const fallback = /^https?:\/\//.test(String(req.query.fallback || '')) ? String(req.query.fallback) : null;
  try {
    const url = await findStoreLink({ productId: productId || null, token, store });
    if (!url) console.log('[store-link] no direct link, sending Google page');
    res.json({ url: url || fallback, direct: Boolean(url) });
  } catch (e) {
    console.log('[store-link] error:', e.message);
    if (e instanceof SearchError && e.code === 'QUOTA') return res.json({ url: fallback, direct: false, note: 'out of searches today' });
    if (e instanceof SearchError) return res.status(e.status).json({ url: fallback, direct: false, message: e.message });
    console.error('Store link lookup failed:', e);
    res.json({ url: fallback, direct: false });
  }
});

// GET /api/search/go?productId=&token=&store=&fallback=
// A plain link target: finds the store page and redirects the new tab to it.
r.get('/go', async (req, res) => {
  const rawId = String(req.query.productId || '');
  const productId = rawId.startsWith('g-') ? rawId.slice(2) : '';
  const store = String(req.query.store || '');
  const token = String(req.query.token || '').slice(0, 8000) || null;
  const fb = String(req.query.fallback || '');
  const fallback = /^https:\/\/(www\.)?google\.[a-z.]+\//i.test(fb) ? fb : 'https://www.google.co.in/shopping';
  let url = null;
  try { url = await findStoreLink({ productId: productId || null, token, store }); }
  catch (e) { console.log('[store-link] error:', e.message); }
  res.redirect(302, url && /^https?:\/\//i.test(url) ? url : fallback);
});

// GET /api/search/offers?productId=g-123&token=...  -> every store selling this exact product
// Sorted by what you pay. First time = 1 search, then saved 24 h (shared with "view at store").
r.get('/offers', async (req, res) => {
  const rawId = String(req.query.productId || '');
  const productId = rawId.startsWith('g-') ? rawId.slice(2) : '';
  const token = String(req.query.token || '').slice(0, 8000) || null;
  if (!productId && !token) return res.status(400).json({ message: 'This offer has no product details to compare.', code: 'NO_PRODUCT' });
  try {
    const { sellers, product, cached, fetchedAt } = await getSellers({ productId: productId || null, token });
    const offers = [...sellers].sort((a, b) => (a.youPay ?? a.price + 1e7) - (b.youPay ?? b.price + 1e7));
    res.json({ offers, product, cached, fetchedAt });
  } catch (e) {
    if (e instanceof SearchError) return res.status(e.status).json({ message: e.message, code: e.code });
    console.error('Offers lookup failed:', e);
    res.status(500).json({ message: 'Could not load the stores for this item.' });
  }
});

// POST /api/search/report { reason, note?, productId?, title?, store?, url?, price? }
r.post('/report', async (req, res) => {
  const b = req.body || {};
  const reasons = ['wrong item', 'wrong price', 'broken link', 'size info wrong', 'other'];
  if (!reasons.includes(b.reason)) return res.status(400).json({ message: 'Pick a reason.' });
  const s = (v, n) => (v == null ? undefined : String(v).slice(0, n));
  await Report.create({ reason: b.reason, note: s(b.note, 300), productId: s(b.productId, 80), title: s(b.title, 200), store: s(b.store, 80), url: s(b.url, 2000), price: Number(b.price) || undefined });
  res.json({ ok: true, message: 'thanks! the team will check it ♡' });
});

// GET /api/search/sizes?url=<store product page>&size=M   (free: reads the store page, no search quota)
// -> { status: 'ok'|'unknown', sizes: [{ size, available, price }], mine: 'in'|'out'|'not offered'|'unknown' }
r.get('/sizes', async (req, res) => {
  const url = String(req.query.url || '');
  let host = '';
  try { host = new URL(url).hostname; } catch { /* bad link */ }
  if (!/^https?:\/\//i.test(url) || !host || /(^|\.)google\./i.test(host)) {
    return res.json({ status: 'unknown', reason: 'no store page for this offer', sizes: [], mine: 'unknown' });
  }
  try {
    const data = await readSizes(url);
    res.json({ ...data, mine: sizeStatus(data, req.query.size) });
  } catch (e) {
    console.warn('Size read failed:', e.message);
    res.json({ status: 'unknown', reason: 'store page could not be read', sizes: [], mine: 'unknown' });
  }
});

export default r;
