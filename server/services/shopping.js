// Live product search through SerpApi's Google Shopping engine (India).
// Supports several keys: SERPAPI_KEYS=key1,key2,key3 (or a single SERPAPI_KEY).
// When one key runs out, it moves to the next automatically.

import mongoose from 'mongoose';
import SearchCache from '../models/SearchCache.js';
import PriceSnapshot from '../models/PriceSnapshot.js';

const keys = () => (process.env.SERPAPI_KEYS || process.env.SERPAPI_KEY || '')
  .split(',').map((k) => k.trim()).filter(Boolean);
let keyIndex = 0;

const LIMIT = () => Number(process.env.SEARCH_RESULT_LIMIT) || 40;
const CACHE_HOURS = () => Number(process.env.SEARCH_CACHE_HOURS) || 12;
const dbReady = () => mongoose.connection.readyState === 1;
const memoryCache = new Map(); // used when MongoDB isn't connected

export class SearchError extends Error {
  constructor(message, status = 502, code) { super(message); this.status = status; this.code = code; }
}

export const normalise = (q) => String(q || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

// "Free delivery" -> 0, "₹40 delivery" -> 40, anything else -> null (unknown)
// "Free delivery above ₹499" -> 0 if the item costs ₹499+, otherwise unknown.
export function parseDelivery(text, price = 0) {
  if (!text) return null;
  const t = String(text).toLowerCase().replace(/,/g, '');
  const amount = (s) => { const m = s.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/); return m ? Math.round(Number(m[1])) : null; };
  if (t.includes('free')) {
    const over = t.match(/(?:above|over|on orders? (?:above|over|of)|orders? over|min(?:imum)?(?: order)?(?: of)?)\s*((?:₹|rs\.?|inr)\s*\d+(?:\.\d+)?)/);
    if (over) { const min = amount(over[1]); return min !== null && price >= min ? 0 : null; }
    return 0;
  }
  if (/deliver|shipping|ship/.test(t) || /^\s*\+?\s*(₹|rs|inr)/.test(t)) return amount(t);
  return null;
}

const toNumber = (v) => {
  if (typeof v === 'number') return v;
  const n = Number(String(v || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Turn SerpApi's raw rows into the shape the website uses.
function mapResult(r, i) {
  const price = toNumber(r.extracted_price ?? r.price);
  if (!price) return null;
  const originalPrice = toNumber(r.extracted_old_price ?? r.old_price);
  const ext = [r.delivery, ...(Array.isArray(r.extensions) ? r.extensions : []), r.shipping].filter(Boolean).map(String);
  const deliveryText = ext.find((e) => /deliver|shipping/i.test(e)) || '';
  const delivery = parseDelivery(deliveryText, price);
  const store = r.source || 'Unknown store';
  return {
    id: r.product_id ? `g-${r.product_id}` : `r-${i}-${normalise(r.title).slice(0, 40)}`,
    title: r.title,
    store,
    storeIcon: r.source_icon || null,
    url: r.link || r.product_link || null,
    image: r.thumbnail || (Array.isArray(r.thumbnails) ? r.thumbnails[0] : null),
    price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
    discount: originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0,
    delivery,                       // number, or null = check at store
    deliveryText: deliveryText || null,
    finalPrice: delivery === null ? null : price + delivery,
    rating: r.rating ?? null,
    reviews: r.reviews ?? null,
    secondHand: Boolean(r.second_hand_condition),
  };
}

// Adds "x% below the typical price in these results" and a deal rank.
function scoreResults(items) {
  const prices = items.map((p) => p.finalPrice ?? p.price).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  return items.map((p) => {
    const effective = p.finalPrice ?? p.price;
    const belowTypical = median ? Math.round((1 - effective / median) * 100) : 0;
    const ratingBoost = p.rating ? (p.rating - 3.5) * 4 : 0;
    const unknownDeliveryPenalty = p.delivery === null ? 3 : 0;
    return { ...p, belowTypical, dealScore: Math.round(belowTypical + p.discount * 0.3 + ratingBoost - unknownDeliveryPenalty) };
  });
}

async function callSerpApi(params) {
  const list = keys();
  if (!list.length) throw new SearchError('Live search is not configured (no SERPAPI key).', 503, 'NO_KEY');
  for (let tries = 0; tries < list.length; tries += 1) {
    const key = list[keyIndex % list.length];
    const url = `https://serpapi.com/search.json?${new URLSearchParams({ ...params, api_key: key })}`;
    let res; let data;
    try {
      res = await fetch(url);
      data = await res.json().catch(() => ({}));
    } catch (e) {
      throw new SearchError('Could not reach the product search service.', 502, 'NETWORK');
    }
    const err = String(data.error || '');
    const outOfQuota = res.status === 429 || /run out|limit|exceeded/i.test(err);
    const badKey = res.status === 401 || /invalid api key/i.test(err);
    if (outOfQuota || badKey) {
      console.warn(`SerpApi key #${(keyIndex % list.length) + 1} ${outOfQuota ? 'is out of searches' : 'is invalid'}; trying the next one.`);
      keyIndex += 1;
      continue;
    }
    if (err && !/hasn't returned any results/i.test(err)) throw new SearchError(`Search service error: ${err}`, 502, 'API');
    return data;
  }
  throw new SearchError('All search keys are out of searches for now.', 503, 'QUOTA');
}

async function readCache(key) {
  const maxAge = CACHE_HOURS() * 3_600_000;
  if (dbReady()) {
    const hit = await SearchCache.findOne({ key }).lean();
    if (hit && Date.now() - new Date(hit.fetchedAt).getTime() < maxAge) return hit;
  } else {
    const hit = memoryCache.get(key);
    if (hit && Date.now() - hit.fetchedAt.getTime() < maxAge) return hit;
  }
  return null;
}

async function writeCache(key, query, results) {
  const doc = { key, query, results, fetchedAt: new Date() };
  if (dbReady()) {
    await SearchCache.updateOne({ key }, doc, { upsert: true });
    // Price history: one snapshot per product per live fetch.
    PriceSnapshot.insertMany(results.map((p) => ({
      productKey: p.id, title: p.title, store: p.store, price: p.price, delivery: p.delivery, query,
    }))).catch((e) => console.warn('Price snapshot save failed:', e.message));
  } else {
    memoryCache.set(key, doc);
  }
}

// Adds price-history badges from saved snapshots (free: database only).
// lowestSeen = cheaper than every earlier sighting; droppedBy = ₹ cheaper than the last sighting.
async function addHistory(results, fetchedAt) {
  if (!dbReady() || !results.length) return results;
  const before = new Date(new Date(fetchedAt).getTime() - 60_000);
  try {
    const rows = await PriceSnapshot.aggregate([
      { $match: { productKey: { $in: results.map((p) => p.id) }, at: { $lt: before } } },
      { $sort: { at: 1 } },
      { $group: { _id: '$productKey', min: { $min: '$price' }, last: { $last: '$price' }, seen: { $sum: 1 } } },
    ]);
    const h = new Map(rows.map((x) => [x._id, x]));
    return results.map((p) => {
      const x = h.get(p.id);
      if (!x) return { ...p, seenBefore: 0 };
      return { ...p, seenBefore: x.seen, lowestSeen: p.price < x.min, droppedBy: x.last > p.price ? Math.round(x.last - p.price) : 0 };
    });
  } catch (e) {
    console.warn('Price history lookup failed:', e.message);
    return results;
  }
}

// Live searches used today (India time), counted from fresh cache writes.
export async function searchesToday() {
  if (!dbReady()) return null;
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3_600_000);
  return SearchCache.countDocuments({ fetchedAt: { $gte: start } });
}

const REFRESH_AFTER_H = 6;
const canRefresh = (fetchedAt) => Date.now() - new Date(fetchedAt).getTime() > REFRESH_AFTER_H * 3_600_000;

// Main entry: text query -> ranked results. Returns { query, results, cached, fetchedAt }.
export async function searchProducts(rawQuery, { refresh = false } = {}) {
  const query = normalise(rawQuery);
  if (query.length < 2) throw new SearchError('Type at least 2 characters to search.', 400, 'SHORT');
  const key = `text:${query}`;

  const cached = await readCache(key);
  if (cached && !(refresh && canRefresh(cached.fetchedAt))) {
    return { query, results: await addHistory(cached.results, cached.fetchedAt), cached: true, fetchedAt: cached.fetchedAt, canRefresh: canRefresh(cached.fetchedAt), usedToday: await searchesToday() };
  }

  const data = await callSerpApi({
    engine: 'google_shopping',
    q: query,
    google_domain: 'google.co.in',
    gl: 'in',
    hl: 'en',
    location: 'India',
  });
  const rows = Array.isArray(data.shopping_results) ? data.shopping_results : [];
  const results = scoreResults(rows.map(mapResult).filter(Boolean)).slice(0, LIMIT());
  const fetchedAt = new Date();
  const withHistory = await addHistory(results, fetchedAt);  // compare before saving today's prices
  await writeCache(key, query, results);
  return { query, results: withHistory, cached: false, fetchedAt, canRefresh: false, usedToday: await searchesToday() };
}

// ---------- Image search (Google Lens through SerpApi) ----------
// Lens returns "visual matches"; with type=products most of them carry a price.
function mapLensResult(m, i) {
  const price = toNumber(m.price?.extracted_value ?? m.price?.value);
  if (!price) return null;
  const cur = String(m.price?.currency || '');
  if (cur && !/₹|rs|inr/i.test(cur)) return null;          // keep Indian-rupee offers only
  if (m.in_stock === false) return null;                     // skip out-of-stock listings
  const store = m.source || 'Unknown store';
  const originalPrice = toNumber(m.price?.extracted_old_value ?? m.price?.old_value);
  return {
    id: `l-${normalise(`${store} ${m.title}`).replace(/\s/g, '-').slice(0, 60)}`,
    title: m.title,
    store,
    storeIcon: m.source_icon || null,
    url: m.link || null,
    image: m.thumbnail || m.image || null,
    price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
    discount: originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0,
    delivery: null,
    deliveryText: null,
    finalPrice: null,
    rating: m.rating ?? null,
    reviews: m.reviews ?? null,
    secondHand: /used|refurb|pre-owned/i.test(String(m.condition || '')),
    visual: true,                                            // found by looks, not by words
  };
}

// cacheKey identifies the photo (hash), getImageUrl() is only called on a cache miss.
export async function searchByImage({ cacheKey, getImageUrl }) {
  const cached = await readCache(cacheKey);
  if (cached) return { query: 'photo', results: await addHistory(cached.results, cached.fetchedAt), cached: true, fetchedAt: cached.fetchedAt, usedToday: await searchesToday() };

  const data = await callSerpApi({
    engine: 'google_lens',
    url: getImageUrl(),
    country: 'in',
    hl: 'en',
  });
  const rows = data.visual_matches || data.products || [];
  const seen = new Set();
  const mapped = rows.map(mapLensResult).filter(Boolean).filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
  const results = scoreResults(mapped).slice(0, LIMIT());
  const fetchedAt = new Date();
  const withHistory = await addHistory(results, fetchedAt);
  await writeCache(cacheKey, 'photo', results);
  return { query: 'photo', results: withHistory, cached: false, fetchedAt, usedToday: await searchesToday() };
}
