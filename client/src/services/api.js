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
export async function searchRequest(q, { refresh = false } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}${refresh ? '&refresh=1' : ''}`);
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
