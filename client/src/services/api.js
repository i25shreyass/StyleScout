// Talks to the StyleScout Express API. Change VITE_API_URL in client/.env to override.
const BASE = import.meta.env.VITE_API_URL ?? ''; // same address in dev (Vite proxy) and on Render

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running on port 5001.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.code = data.code; // e.g. EMAIL_NOT_VERIFIED
    throw err;
  }
  return data;
}

export const signupRequest = (body) => post('/api/auth/signup', body);
export const loginRequest = (body) => post('/api/auth/login', body);
export const verifyEmailRequest = (body) => post('/api/auth/verify-email', body);
export const resendVerificationRequest = (body) => post('/api/auth/resend-verification', body);
export const forgotPasswordRequest = (body) => post('/api/auth/forgot-password', body);
export const resetPasswordRequest = (body) => post('/api/auth/reset-password', body);

// Live product search. Throws Error with .code (NO_KEY, QUOTA, NETWORK, ...) on failure.
export async function searchRequest(q, { refresh = false, force = false } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}${refresh ? '&refresh=1' : ''}${force ? '&force=1' : ''}`);
  } catch {
    const e = new Error('Cannot reach the server.'); e.code = 'NETWORK'; throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || `Search failed (${res.status})`); e.code = data.code; throw e; }
  if (!Array.isArray(data.results)) { const e = new Error('The search server sent an unexpected reply. Restart npm run dev.'); e.code = 'NETWORK'; throw e; }
  return data;
}

// Reads a pasted product link (free, no search quota). Returns { query, source }.
export const readLinkRequest = (url) => post('/api/search/link', { url });

// True when the text is a web link rather than search words.
export const looksLikeUrl = (s) => /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*/i.test(String(s || '').trim());

// True when the text is a direct link to a picture.
export const looksLikeImageUrl = (s) => /^(https?:\/\/)\S+\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i.test(String(s || '').trim());

// Shrinks a photo to at most 1000px (JPEG) so uploads are small and quick.
export async function shrinkImage(file, max = 1000) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch {
    const e = new Error('Could not read that photo. Try a JPG or PNG.'); e.code = 'BAD_IMAGE'; throw e;
  }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that photo.'))), 'image/jpeg', 0.85));
}

// Look-alike search from a photo (blob) or a link to a photo. Uses 1 live search.
export async function imageSearchRequest({ blob, url }) {
  let res;
  try {
    if (blob) {
      const fd = new FormData();
      fd.append('image', blob, 'photo.jpg');
      res = await fetch(`${BASE}/api/search/image`, { method: 'POST', body: fd });
    } else {
      res = await fetch(`${BASE}/api/search/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    }
  } catch {
    const e = new Error('Cannot reach the server.'); e.code = 'NETWORK'; throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || `Photo search failed (${res.status})`); e.code = data.code; throw e; }
  if (!Array.isArray(data.results)) { const e = new Error('The search server sent an unexpected reply. Restart npm run dev.'); e.code = 'NETWORK'; throw e; }
  return data;
}

// "My size" saved to the account (only when logged in).
export async function getSizesRequest(token) {
  const res = await fetch(`${BASE}/api/profile/sizes`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Could not load your sizes');
  return res.json();
}
export async function saveSizesRequest(token, sizes) {
  const res = await fetch(`${BASE}/api/profile/sizes`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(sizes),
  });
  if (!res.ok) throw new Error('Could not save your sizes');
  return res.json();
}


// Wishlist requests and a shared saved-key cache keep result cards from issuing
// one GET apiece. The cache is scoped to the current token in this browser.
const wishlistCache = new Map();
const wishlistListeners = new Set();
const notifyWishlist = () => wishlistListeners.forEach((listener) => listener());
export const subscribeWishlist = (listener) => {
  wishlistListeners.add(listener);
  return () => wishlistListeners.delete(listener);
};
export const wishlistHas = (productKey) => Boolean(wishlistCache.get('active')?.items?.some((item) => item.productKey === productKey));

async function wishlistRequest(token, path = '', options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api/wishlist${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...options.headers },
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running on port 5001.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Wishlist request failed (${res.status})`);
  return data;
}

export function getWishlistRequest(token) {
  if (!token) return Promise.reject(new Error('Log in to view your wishlist.'));
  if (wishlistCache.get('active')?.token !== token) wishlistCache.set('active', { token, items: null, promise: null });
  const state = wishlistCache.get('active');
  if (state.items) return Promise.resolve(state.items);
  if (!state.promise) {
    state.promise = wishlistRequest(token).then((items) => {
      if (wishlistCache.get('active')?.token === token) {
        state.items = items;
        notifyWishlist();
      }
      return items;
    }).catch((error) => { state.promise = null; throw error; });
  }
  return state.promise;
}

export async function saveWishlistItemRequest(token, product, query) {
  const item = await wishlistRequest(token, '', { method: 'POST', body: JSON.stringify({ ...product, productKey: product.productKey || product.id, query, price: product.price }) });
  const state = wishlistCache.get('active');
  if (state?.token === token && state.items) {
    state.items = [item, ...state.items.filter((x) => x.productKey !== item.productKey)];
    notifyWishlist();
  }
  return item;
}

export async function deleteWishlistItemRequest(token, productKey) {
  await wishlistRequest(token, `/${encodeURIComponent(productKey)}`, { method: 'DELETE' });
  const state = wishlistCache.get('active');
  if (state?.token === token && state.items) {
    state.items = state.items.filter((item) => item.productKey !== productKey);
    notifyWishlist();
  }
}

// Sprint 5: the store's own page for one product (1 search per product, cached 24 h).
export async function storeLinkRequest({ productId, token, store, fallback }) {
  const memo = `ss_store_${productId}_${store}`;
  const known = sessionStorage.getItem(memo);
  if (known) return known;                                    // already found this session: no server call
  const qs = new URLSearchParams({ productId, store, fallback: fallback || '' });
  if (token) qs.set('token', token);
  const res = await fetch(`${BASE}/api/search/offer?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (data.direct && data.url) sessionStorage.setItem(memo, data.url);
  return data.url || fallback || null;
}

async function alertApiRequest(token, path = '', options = {}) {
  if (!token) throw new Error('Log in to manage price alerts.');
  let res;
  try {
    res = await fetch(`${BASE}/api/alerts${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...options.headers },
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running on port 5001.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Alert request failed (${res.status})`);
  return data;
}

export const getAlertsRequest = (token) => alertApiRequest(token);
export const createAlertRequest = (token, product, query, targetPrice) => alertApiRequest(token, '', {
  method: 'POST', body: JSON.stringify({ product, query, targetPrice }),
});
export const updateAlertRequest = (token, id, changes) => alertApiRequest(token, `/${encodeURIComponent(id)}`, {
  method: 'PATCH', body: JSON.stringify(changes),
});
export const deleteAlertRequest = (token, id) => alertApiRequest(token, `/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Sprint 6: every store selling this exact product (1 search the first time, then saved 24 h).
export async function offersRequest({ productId, token }) {
  const qs = new URLSearchParams({ productId: productId || '' });
  if (token) qs.set('token', token);
  let res;
  try { res = await fetch(`${BASE}/api/search/offers?${qs}`); } catch { const e = new Error('Cannot reach the server.'); e.code = 'NETWORK'; throw e; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || `Could not load stores (${res.status})`); e.code = data.code; throw e; }
  return data;
}

// Sprint 7: is this size in stock on the store's own page? (free)
export async function sizeStockRequest(url, size) {
  const qs = new URLSearchParams({ url, size: size || '' });
  const res = await fetch(`${BASE}/api/search/sizes?${qs}`);
  return res.ok ? res.json() : { status: 'unknown', mine: 'unknown', sizes: [] };
}

// Sprint 8: "report wrong match or price"
export async function reportRequest(body) {
  const res = await fetch(`${BASE}/api/search/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not send the report.');
  return data;
}

// Real products for the homepage, by category (free: read from the database). Cached for this visit.
let featuredCache = null;
export async function featuredRequest() {
  if (featuredCache) return featuredCache;
  const res = await fetch(`${BASE}/api/search/featured`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load featured products.');
  if (data.total) featuredCache = data;
  return data;
}
