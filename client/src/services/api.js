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
export async function searchRequest(q) {
  let res;
  try {
    res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
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
