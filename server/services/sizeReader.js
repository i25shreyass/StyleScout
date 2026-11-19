// Sprint 7: "is my size in stock?" — reads size availability from a store's own product page.
// Free (no search quota). Only uses data the store publishes openly:
//   1. Shopify stores: the public /products/<handle>.js product data (variants + available).
//   2. Any store: schema.org JSON-LD offers that carry a size and availability.
// Anything else (or a blocked page) returns status 'unknown'. We never guess or get around blocks.

import { fetchPage } from './linkReader.js';

const CACHE_MIN = 30;
const cache = new Map(); // url -> { at, data }

// "Medium" -> "M", "UK 9" / "9 UK" / "UK-9" -> "9", "32W" -> "32"
export function normSize(s) {
  let t = String(s || '').toLowerCase().replace(/[^a-z0-9.]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = { 'extra extra small': 'xxs', 'extra small': 'xs', small: 's', medium: 'm', large: 'l', 'extra large': 'xl', 'extra extra large': 'xxl', '2xl': 'xxl', '3xl': 'xxxl', 'free size': 'free', onesize: 'free', 'one size': 'free' };
  if (words[t]) return words[t];
  t = t.replace(/\b(uk|us|eu|ind|india|in|size)\b/g, '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(\d{1,3}(?:\.5)?)\s*(w|cm)?$/);
  if (m) return m[1];
  return t.replace(/\s/g, '');
}

// Description, colours and material from Shopify product data (all public).
const stripHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function shopifyDetails(product) {
  const opts = (product.options || []).map((o) => (typeof o === 'string' ? { name: o } : o));
  const ci = opts.findIndex((o) => /colou?r/i.test(o.name || ''));
  const colours = ci >= 0 ? [...new Set((product.variants || []).map((v) => v[`option${ci + 1}`]).filter(Boolean))] : [];
  const text = stripHtml(product.description || product.body_html);
  // only a clear composition ("60% cotton, 40% polyester") or a labelled line ("Fabric: Cotton")
  const material = text.match(/\d{1,3}\s*%\s*[a-z]+(?:\s*[,&/+]\s*\d{1,3}\s*%\s*[a-z]+)*/i)?.[0]
    || text.match(/\b(?:fabric|material|composition)\s*[:\-–]\s*([a-z0-9 %,&/-]{3,40})/i)?.[1]?.trim() || null;
  return { description: text.slice(0, 500) || null, colours: colours.slice(0, 12), material, type: product.type || null, vendor: product.vendor || null };
}

const SIZE_OPTION = /^(size|sizes|shoe size|waist|waist size|uk size|us size|fit size)$/i;

function fromShopify(product) {
  if (!product || !Array.isArray(product.variants)) return null;
  const opts = (product.options || []).map((o) => (typeof o === 'string' ? o : o.name));
  let idx = opts.findIndex((n) => SIZE_OPTION.test(String(n || '').trim()));
  if (idx < 0 && opts.length === 1 && product.variants.length > 1) idx = 0; // single option is almost always size
  if (idx < 0) return null;
  const key = `option${idx + 1}`;
  const map = new Map();
  for (const v of product.variants) {
    const size = String(v[key] || '').trim();
    if (!size) continue;
    const prev = map.get(size);
    const price = v.price != null ? (typeof v.price === 'number' ? v.price / 100 : Number(v.price)) : null;
    map.set(size, { size, available: Boolean(prev?.available || v.available), price: prev?.price ?? price });
  }
  return [...map.values()];
}

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) { try { out.push(JSON.parse(m[1].trim())); } catch { /* ignore broken blocks */ } }
  return out;
}

function fromJsonLd(html) {
  const sizes = new Map();
  const inStock = (a) => /instock|limitedavailability|onlineonly/i.test(String(a || ''));
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const offers = [].concat(node.offers?.offers || node.offers || []);
    const size = node.size?.name || node.size;
    if (size && typeof size === 'string' && offers.length) {
      const o = offers[0];
      sizes.set(size, { size, available: inStock(o.availability), price: Number(o.price) || null });
    }
    for (const o of offers) {
      const s = o?.itemOffered?.size?.name || o?.itemOffered?.size || o?.size;
      if (s && typeof s === 'string') sizes.set(s, { size: s, available: inStock(o.availability), price: Number(o.price) || null });
    }
    if (node.hasVariant) visit(node.hasVariant);
    if (node['@graph']) visit(node['@graph']);
  };
  jsonLdBlocks(html).forEach(visit);
  return sizes.size ? [...sizes.values()] : null;
}

// Shopify product pages live at /products/<handle> (sometimes under /collections/x/products/<handle>).
const shopifyHandle = (u) => u.pathname.match(/\/products\/([^/?#.]+)/)?.[1] || null;

export async function readSizes(rawUrl) {
  let u;
  try { u = new URL(String(rawUrl || '').trim()); } catch { return { status: 'unknown', reason: 'bad link', sizes: [] }; }
  if (!/^https?:$/.test(u.protocol)) return { status: 'unknown', reason: 'bad link', sizes: [] };
  const key = `${u.origin}${u.pathname}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MIN * 60_000) return hit.data;

  let sizes = null; let source = null; let details = null;
  try {
    const handle = shopifyHandle(u);
    if (handle) {
      const r = await fetchPage(new URL(`/products/${handle}.js`, u.origin), { json: true });
      if (r.html) { try { const prod = JSON.parse(r.html); sizes = fromShopify(prod); details = shopifyDetails(prod); source = sizes ? 'store data' : null; } catch { /* not Shopify */ } }
    }
    if (!sizes) {
      const r = await fetchPage(new URL(u.href));
      if (r.html) { sizes = fromJsonLd(r.html); source = sizes ? 'store page' : null; }
    }
  } catch (e) {
    console.warn('[sizes] read failed:', e.message);
    return { status: 'unknown', reason: 'store page could not be read', sizes: [] };
  }
  const data = sizes?.length
    ? { status: 'ok', source, store: u.hostname.replace(/^www\./, ''), sizes, details, checkedAt: new Date() }
    : { status: 'unknown', reason: 'this store does not share size stock', sizes: [] };
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return data;
}

// Answer for one size: 'in' | 'out' | 'not offered' | 'unknown'
export function sizeStatus(data, mySize) {
  if (!data || data.status !== 'ok' || !mySize) return 'unknown';
  const want = normSize(mySize);
  // "M-40", "UK 9 / EU 43", "32 (M)" -> check every part of the label
  const parts = (label) => [label, ...String(label).split(/[-/|(),]+/)].map(normSize).filter(Boolean);
  const row = data.sizes.find((s) => normSize(s.size) === want) || data.sizes.find((s) => parts(s.size).includes(want));
  if (!row) return 'not offered';
  return row.available ? 'in' : 'out';
}
