// Sends transactional email through Brevo (default) or Resend using their HTTP APIs.
// No extra npm packages needed (uses Node's built-in fetch).
//
// If EMAIL_API_KEY is empty, the email is NOT sent; the link is printed in the
// server terminal instead, so you can still test the flow locally.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const safeHttpUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};

async function sendMail({ to, subject, html, text }) {
  const key = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || 'StyleScout';
  const provider = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();

  if (!key || !from) {
    console.log(`\n[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  let res;
  if (provider === 'resend') {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to: [to], subject, html, text }),
    });
  } else {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: fromName, email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${provider} responded ${res.status}: ${detail.slice(0, 300)}`);
  }
}

const layout = (title, body, buttonText, link) => `
<div style="font-family:Arial,sans-serif;background:#f6f1ff;padding:24px">
  <div style="max-width:480px;margin:auto;background:#fff;border:2px solid #2b2559;box-shadow:4px 4px 0 #2b2559">
    <div style="background:linear-gradient(90deg,#ffc2e6,#e1b0ff);border-bottom:2px solid #2b2559;padding:10px 14px;font-weight:bold;color:#241c52">StyleScout ✦ ${esc(title)}</div>
    <div style="padding:22px;color:#241c52;line-height:1.55">
      ${body}
      <p style="text-align:center;margin:26px 0"><a href="${link}" style="background:#f78cc8;border:2px solid #2b2559;color:#2a0f3f;padding:11px 22px;font-weight:bold;text-decoration:none">${esc(buttonText)}</a></p>
      <p style="font-size:12px;color:#6a6396">If the button doesn't work, paste this link into your browser:<br>${link}</p>
    </div>
  </div>
</div>`;

export async function sendVerificationEmail(user, rawToken) {
  const link = `${clientUrl()}/verify-email?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your StyleScout email',
    text: `Hi ${user.name}, verify your email (link valid for 24 hours): ${link}`,
    html: layout('verify your email', `<p>Hi ${esc(user.name)},</p><p>Welcome to StyleScout! Please confirm your email address to activate your account. This link works for 24 hours.</p>`, 'verify my email', link),
  });
}

export async function sendResetEmail(user, rawToken) {
  const link = `${clientUrl()}/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your StyleScout password',
    text: `Hi ${user.name}, reset your password (link valid for 1 hour): ${link}. If you didn't ask for this, ignore this email.`,
    html: layout('reset your password', `<p>Hi ${esc(user.name)},</p><p>We got a request to reset your password. This link works for 1 hour. If you didn't ask for this, you can safely ignore this email.</p>`, 'reset password', link),
  });
}

export async function sendPriceAlertEmail(user, alert, newPrice) {
  if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Price alert email is not configured. Set EMAIL_API_KEY and a verified EMAIL_FROM sender.');
  }
  const storeUrl = safeHttpUrl(alert.url);
  const link = storeUrl || safeHttpUrl(`${clientUrl()}/alerts`) || 'https://stylescout-twyy.onrender.com/alerts';
  const image = safeHttpUrl(alert.image);
  const oldPrice = Number(alert.lastPrice);
  const priceText = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const imageHtml = image
    ? `<p style="text-align:center"><img src="${esc(image)}" alt="${esc(alert.title)}" width="220" style="max-width:100%;height:auto;border:2px solid #2b2559"></p>`
    : '';
  const body = `${imageHtml}<p>Hi ${esc(user.name || 'there')},</p><p><b>${esc(alert.title)}</b>${alert.store ? ` at ${esc(alert.store)}` : ''} reached your target price!</p><p style="text-align:center;font-size:18px"><s>${priceText(oldPrice)}</s> &rarr; <b>${priceText(newPrice)}</b></p>`;
  await sendMail({
    to: user.email,
    subject: `Price drop: ${String(alert.title).replace(/[\r\n]/g, ' ').slice(0, 100)}`,
    text: `Hi ${user.name || 'there'}, ${alert.title}${alert.store ? ` at ${alert.store}` : ''} is now ${priceText(newPrice)} (last seen ${priceText(oldPrice)}). View it: ${link}`,
    html: layout('price drop alert', body, 'view at store', esc(link)),
  });
}
