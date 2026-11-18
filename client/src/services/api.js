// Talks to the StyleScout Express API. Change VITE_API_URL in client/.env to override.
// Dev: the API runs separately on port 5001. Production (Render): the same server serves the site, so use the same address.
const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5001');

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
