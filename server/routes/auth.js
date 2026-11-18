import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { verifyCaptcha } from '../utils/captcha.js';
import { sendVerificationEmail, sendResetEmail } from '../utils/mailer.js';

const r = Router();
r.use(rateLimit({
  windowMs: 15 * 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
}));

const HOUR = 3_600_000;
const validEmail = (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const normEmail = (x) => String(x || '').trim().toLowerCase();
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const newToken = () => { const raw = crypto.randomBytes(32).toString('hex'); return { raw, hash: sha(raw) }; };
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// Sends the error response itself and returns false when the CAPTCHA fails.
async function captchaOk(req, res) {
  const result = await verifyCaptcha(req.body.captchaToken, req.ip);
  if (!result.success) res.status(result.status).json({ message: result.message });
  return result.success;
}

// POST /api/auth/signup  { name, email, password, captchaToken }
r.post('/signup', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!name || !validEmail(email) || password.length < 8) {
    return res.status(400).json({ message: 'Enter a name, valid email and password of at least 8 characters' });
  }
  if (!(await captchaOk(req, res))) return;
  if (await User.findOne({ email })) return res.status(409).json({ message: 'Email already registered' });

  const t = newToken();
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    emailVerified: false,
    verifyTokenHash: t.hash,
    verifyTokenExpires: new Date(Date.now() + 24 * HOUR),
  });

  let emailSent = true;
  try { await sendVerificationEmail(user, t.raw); } catch (e) { emailSent = false; console.error('Verification email failed:', e.message); }
  res.status(201).json({ message: 'Account created. Check your email to verify it.', emailSent });
}));

// POST /api/auth/login  { email, password, captchaToken }
r.post('/login', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!(await captchaOk(req, res))) return;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (user.emailVerified === false) {
    return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first. Check your inbox for the link.' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-only-secret', { expiresIn: '7d' });
  res.json({ token, user: { name: user.name, role: user.role } });
}));

// POST /api/auth/verify-email  { token }
r.post('/verify-email', wrap(async (req, res) => {
  const token = String(req.body.token || '');
  if (!token) return res.status(400).json({ message: 'Missing verification token.' });
  const user = await User.findOne({ verifyTokenHash: sha(token), verifyTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: 'This link is invalid, expired, or already used. Try logging in, or request a new link.' });
  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Email verified! You can log in now.' });
}));

// POST /api/auth/resend-verification  { email }   (always answers the same, so emails can't be probed)
r.post('/resend-verification', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const generic = { message: 'If that account exists and is not verified yet, a new link is on its way.' };
  if (!validEmail(email)) return res.json(generic);
  const user = await User.findOne({ email });
  if (user && user.emailVerified === false) {
    const t = newToken();
    user.verifyTokenHash = t.hash;
    user.verifyTokenExpires = new Date(Date.now() + 24 * HOUR);
    await user.save();
    try { await sendVerificationEmail(user, t.raw); } catch (e) { console.error('Verification email failed:', e.message); }
  }
  res.json(generic);
}));

// POST /api/auth/forgot-password  { email, captchaToken }
r.post('/forgot-password', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!(await captchaOk(req, res))) return;
  const user = await User.findOne({ email });
  if (user) {
    const t = newToken();
    user.resetTokenHash = t.hash;
    user.resetTokenExpires = new Date(Date.now() + HOUR);
    await user.save();
    try { await sendResetEmail(user, t.raw); } catch (e) { console.error('Reset email failed:', e.message); }
  }
  res.json({ message: 'If that email has an account, a reset link is on its way.' });
}));

// POST /api/auth/reset-password  { token, password }
r.post('/reset-password', wrap(async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  const user = token && await User.findOne({ resetTokenHash: sha(token), resetTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
  user.password = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.emailVerified = true; // they just proved they own this inbox
  await user.save();
  res.json({ message: 'Password updated. You can log in now.' });
}));

export default r;
