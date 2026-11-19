import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import crypto from 'crypto';
import { searchProducts, searchByImage, SearchError } from '../services/shopping.js';
import { readProductLink } from '../services/linkReader.js';

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
    const out = await searchProducts(req.query.q);
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

export default r;
