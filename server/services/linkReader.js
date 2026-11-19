// Turns a pasted product link into { source, query } without spending any search quota.
// 1) Opens the page once and reads its built-in product summary (JSON-LD / Open Graph tags).
// 2) If the store blocks that, reads the product name from the link itself.
// It never tries to get around a store's blocking, and it refuses private/internal addresses.

import dns from 'dns/promises';
import net from 'net';
import { SearchError } from './shopping.js';

const STORES = [
  [/(^|\.)myntra\.com$|(^|\.)myntr\.it$/, 'Myntra'],
  [/(^|\.)ajio\.com$|(^|\.)ajio\.me$/, 'Ajio'],
  [/(^|\.)amazon\.(in|com)$|(^|\.)amzn\.(in|to|eu)$|(^|\.)a\.co$/, 'Amazon'],
  [/(^|\.)flipkart\.com$|(^|\.)fkrt\.(it|co|cc)$|(^|\.)dl\.flipkart\.com$/, 'Flipkart'],
  [/(^|\.)nykaafashion\.com$/, 'Nykaa Fashion'],
  [/(^|\.)tatacliq\.com$/, 'Tata CLiQ'],
  [/(^|\.)meesho\.com$/, 'Meesho'],
  [/(^|\.)hm\.com$/, 'H&M'],
  [/(^|\.)zara\.com$/, 'Zara'],
];
const storeName = (host) => (STORES.find(([re]) => re.test(host)) || [null, host.replace(/^www\./, '')])[1];

const NOISE = new Set(['buy', 'online', 'india', 'in', 'price', 'prices', 'shop', 'at', 'best', 'offer', 'offers', 'sale', 'latest',
  'new', 'arrival', 'arrivals', 'myntra', 'amazon', 'flipkart', 'ajio', 'com', 'www', 'p', 'dp', 'product', 'products', 'item',
  'size', 'sizes', 'en', 'html', 'productpage', 'for', 'the', 'a', 'an', 'and', 'with', 'of', 'by', 'free', 'delivery', 'cod', 'available', 'pack']);
const SIZE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,2}xl|\d{2,3}(cm)?|uk\d+|us\d+|eu\d+)$/;

export const looksLikeUrl = (s) => /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*/i.test(String(s || '').trim());

const GENDER = new Set(['men', 'women', 'boys', 'girls', 'kids', 'unisex', 'baby']);
const COLOURS = new Set(['black', 'white', 'blue', 'navy', 'red', 'maroon', 'pink', 'purple', 'lavender', 'green', 'olive', 'yellow',
  'mustard', 'orange', 'brown', 'beige', 'cream', 'grey', 'gray', 'silver', 'gold', 'peach', 'teal', 'khaki', 'tan', 'multicolour', 'multicolor']);
const TYPES = new Set(['kurta', 'kurtas', 'kurti', 'kurtis', 'sharara', 'saree', 'sari', 'lehenga', 'salwar', 'anarkali', 'dupatta', 'palazzo',
  'jeans', 'shirt', 'shirts', 'tshirt', 'tshirts', 'top', 'tops', 'tee', 'polo', 'dress', 'dresses', 'gown', 'skirt', 'shorts', 'trousers',
  'pants', 'cargo', 'cargos', 'joggers', 'track', 'leggings', 'jeggings', 'jacket', 'jackets', 'blazer', 'coat', 'vest', 'sweater',
  'sweatshirt', 'hoodie', 'cardigan', 'shrug', 'suit', 'jumpsuit', 'co-ord', 'set', 'shoe', 'shoes', 'sneakers', 'sneaker', 'boots',
  'sandals', 'heels', 'flats', 'loafers', 'slippers', 'flip', 'bag', 'handbag', 'backpack', 'wallet', 'watch', 'sunglasses', 'cap', 'belt']);

// Clean a product name into a short search query (brand + gender + colour + product type + key details).
export function cleanQuery(text, hintType = '') {
  const words = String(text || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')                 // drop "(ASKP123_Navy_M)" style codes
    .split(/\s[|–—]\s|\s-\s(?=buy|shop|online)/i)[0]       // drop " | Myntra", " - Buy online ..."
    .replace(/[\s-]+with[\s-]+.*$/i, '')                   // "kurta with sharara with dupatta" -> "kurta" (extras come after "with")
    .toLowerCase()
    .replace(/\bt[\s-]?shirts?\b/g, 'tshirt')
    .replace(/men's|mens/g, 'men').replace(/women's|womens/g, 'women')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w) && !SIZE.test(w) && !/^\d+$/.test(w) && !(/\d/.test(w) && /[a-z]/.test(w) && w.length >= 6));
  let uniq = [...new Set(words)];
  // If the name has no product type but the link's category does (Myntra: /kurta-sets/...), add it.
  if (hintType && !uniq.some((w) => TYPES.has(w))) uniq = [...uniq, ...cleanQuery(hintType).split(' ').filter(Boolean)];
  if (uniq.length <= 8) return uniq.join(' ');
  // Too long: keep the brand (first 2 words), gender, colours and product types, then fill up to 8 in the original order.
  const keep = new Set(uniq.filter((w, i) => i < 2 || GENDER.has(w) || COLOURS.has(w) || TYPES.has(w)));
  for (const w of uniq) { if (keep.size >= 8) break; keep.add(w); }
  return uniq.filter((w) => keep.has(w)).slice(0, 8).join(' ');
}

// Product name hidden in the link's path, e.g. /levis-men-blue-slim-fit-jeans/12345/buy
export function nameFromUrl(u) {
  const parts = u.pathname.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  const host = u.hostname;
  let seg = '';
  const before = (marker) => { const i = parts.indexOf(marker); return i > 0 ? parts[i - 1] : ''; };
  if (/amazon\./.test(host)) seg = before('dp') || before('product');
  else if (/flipkart\.com|ajio\.com|meesho\.com/.test(host)) seg = before('p');
  else if (/myntra\.com/.test(host)) { const i = parts.findIndex((p) => /^\d{5,}$/.test(p)); seg = i > 0 ? parts[i - 1] : ''; }
  if (!seg) seg = parts.filter((p) => /[a-z]/i.test(p) && /[-_+]/.test(p)).sort((a, b) => b.length - a.length)[0] || '';
  return seg.replace(/[-_+]+/g, ' ').replace(/\.html?$/, '').trim();
}

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x.startsWith('::ffff:')) return isPrivateIp(x.slice(7));
    return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(u) {
  if (!/^https?:$/.test(u.protocol)) throw new SearchError('Only http/https links are supported.', 400, 'BAD_LINK');
  if (u.hostname === 'localhost' || net.isIP(u.hostname)) throw new SearchError('Please paste a store product link.', 400, 'BAD_LINK');
  let addrs;
  try { addrs = await dns.lookup(u.hostname, { all: true }); } catch { throw new SearchError("That website couldn't be found. Check the link.", 400, 'BAD_LINK'); }
  if (addrs.some((a) => isPrivateIp(a.address))) throw new SearchError('Please paste a store product link.', 400, 'BAD_LINK');
}

// Fetch with manual redirects (each hop checked), an 8s timeout and a 2 MB cap.
async function fetchPage(startUrl) {
  let u = startUrl;
  for (let hop = 0; hop < 5; hop += 1) {
    await assertPublic(u);
    let res;
    try {
      res = await fetch(u, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StyleScoutBot/1.0; college project price comparison)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-IN,en;q=0.9' },
      });
    } catch {
      return { finalUrl: u, html: '', status: 0 };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      u = new URL(res.headers.get('location'), u);
      continue;
    }
    if (!res.ok || !String(res.headers.get('content-type') || '').includes('html')) return { finalUrl: u, html: '', status: res.status };
    const reader = res.body.getReader();
    const chunks = []; let size = 0;
    while (size < 2_000_000) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); size += value.length;
    }
    reader.cancel().catch(() => {});
    return { finalUrl: u, html: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8'), status: res.status };
  }
  return { finalUrl: u, html: '', status: 0 };
}

const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const meta = (html, name) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1]) : '';
};

function findProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findProduct(n); if (f) return f; } return null; }
  const t = node['@type'];
  if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) return node;
  return findProduct(node['@graph']) || null;
}

// Pulls name/brand/price/image out of a product page's HTML.
export function parseProductHtml(html) {
  if (!html) return null;
  const pageTitle = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]);
  if (/captcha|robot check|access denied|are you a human|something went wrong|request blocked/i.test(pageTitle)) return null;

  let product = null;
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { product = findProduct(JSON.parse(m[1].trim())); } catch { /* ignore broken JSON */ }
    if (product) break;
  }
  const offer = product ? (Array.isArray(product.offers) ? product.offers[0] : product.offers) || {} : {};
  const brand = product ? (typeof product.brand === 'string' ? product.brand : product.brand?.name) : '';
  const image = product ? (Array.isArray(product.image) ? product.image[0] : (product.image?.url || product.image)) : '';
  const currency = String(offer.priceCurrency || meta(html, 'product:price:currency') || meta(html, 'og:price:currency') || 'INR').toUpperCase();
  const rawPrice = Number(offer.price ?? offer.lowPrice ?? (meta(html, 'product:price:amount') || meta(html, 'og:price:amount'))) || null;
  const price = currency === 'INR' ? rawPrice : null; // only show prices we can compare in rupees
  const title = decode(product?.name) || meta(html, 'og:title') || meta(html, 'twitter:title') || pageTitle;
  if (!title) return null;
  return { title, brand: decode(brand) || null, price, image: (typeof image === 'string' && image) || meta(html, 'og:image') || null };
}

export async function readProductLink(raw) {
  let input = String(raw || '').trim();
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  let u;
  try { u = new URL(input); } catch { throw new SearchError("That doesn't look like a valid link.", 400, 'BAD_LINK'); }

  const { finalUrl, html } = await fetchPage(u);
  const page = parseProductHtml(html);
  const store = storeName(finalUrl.hostname);
  const fromLink = nameFromUrl(finalUrl);

  const hint = /myntra\.com/.test(finalUrl.hostname) ? (finalUrl.pathname.split('/').filter(Boolean)[0] || '') : '';

  let query = '';
  let usable = page;
  if (page) query = cleanQuery([page.brand && !page.title.toLowerCase().includes(page.brand.toLowerCase()) ? page.brand : '', page.title].join(' '), hint);
  // A "page" that is really a placeholder (title "Amazon", a logo) isn't the product: ignore it.
  if (page && (query.split(' ').length < 2 || page.title.trim().toLowerCase() === store.toLowerCase())) { usable = null; query = ''; }
  if (query.split(' ').length < 2) query = cleanQuery(fromLink, hint);
  if (query.split(' ').length < 2) {
    throw new SearchError("We couldn't find a product name in that link. Paste a product page link (not a homepage or category), or type what you're looking for.", 422, 'NO_PRODUCT');
  }

  return {
    query,
    source: {
      store,
      url: finalUrl.toString(),
      title: usable?.title || fromLink || null,
      brand: usable?.brand || null,
      price: usable?.price || null,
      image: usable?.image || null,
      readFrom: usable ? 'page' : 'link',
      foreignStore: /amazon\.com$|\.com\/en-us/.test(finalUrl.hostname) || undefined,
    },
  };
}
