// Verifies a Google reCAPTCHA v2 token on the server.
// Returns { success: true } or { success: false, status, message }.
export async function verifyCaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    console.error('RECAPTCHA_SECRET is not set in server/.env');
    return { success: false, status: 500, message: 'CAPTCHA is not configured on the server.' };
  }
  if (!token || typeof token !== 'string') {
    return { success: false, status: 400, message: 'Please complete the CAPTCHA.' };
  }
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body });
    const data = await res.json();
    if (data.success) return { success: true };
    console.warn('reCAPTCHA rejected:', data['error-codes']);
    return { success: false, status: 400, message: 'CAPTCHA check failed. Please try again.' };
  } catch (e) {
    console.error('reCAPTCHA verification error:', e.message);
    return { success: false, status: 502, message: 'Could not verify the CAPTCHA. Please try again.' };
  }
}
