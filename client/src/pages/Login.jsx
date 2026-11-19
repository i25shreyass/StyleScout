import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordRequest, resendVerificationRequest } from '../services/api';
import Captcha from '../components/Captcha';
import { getProfileRequest, setPassportCache } from '../services/passport';
import logo from '../assets/intro/stylescout-chrome-logo.webp';
import camera from '../assets/intro/y2k-camera.webp';
import stickers from '../assets/intro/y2k-stickers.webp';
import './Login.css';

// The "member_login.exe" intro page: log in, sign up, forgot password, or continue as guest.
export default function Login() {
  const { user, login, signup, logout } = useAuth();
  const nav = useNavigate();
  const captchaRef = useRef(null);

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [sent, setSent] = useState(null); // { type: 'verify' | 'reset', email, emailSent? }
  const [busy, setBusy] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setInfo('');
    setUnverified(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setUnverified(false);
    if (mode === 'signup' && !name.trim()) return setError('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (mode === 'signup' && password.length < 8) return setError('Password must be at least 8 characters.');
    if (mode === 'login' && !password) return setError('Enter your password.');
    if (!captchaToken) return setError('Please complete the CAPTCHA to continue.');

    setBusy(true);
    try {
      if (mode === 'signup') {
        const d = await signup(name, email, password, captchaToken);
        setSent({ type: 'verify', email: email.trim().toLowerCase(), emailSent: d.emailSent !== false });
      } else if (mode === 'forgot') {
        await forgotPasswordRequest({ email: email.trim().toLowerCase(), captchaToken });
        setSent({ type: 'reset', email: email.trim().toLowerCase() });
      } else {
        const session = await login(email, password, captchaToken, remember);
        // first time in? offer the optional Style Passport step
        try {
          const prof = await getProfileRequest(session.token);
          setPassportCache(prof);
          nav(prof.passport?.onboarded ? '/home' : '/passport?welcome=1');
        } catch {
          nav('/home');
        }
      }
    } catch (err) {
      setError(err.message);
      if (err.code === 'EMAIL_NOT_VERIFIED') setUnverified(true);
    } finally {
      setBusy(false);
      captchaRef.current?.reset(); // a CAPTCHA token can only be used once
    }
  };

  const resend = async (to) => {
    setError('');
    try {
      const d = await resendVerificationRequest({ email: to });
      setInfo(d.message);
    } catch (err) {
      setError(err.message);
    }
  };

  const win = user ? 'member_area.exe' : sent ? 'mailbox.exe' : mode === 'signup' ? 'new_member.exe' : mode === 'forgot' ? 'password_help.exe' : 'member_login.exe';
  const eyebrow = user ? 'HELLO AGAIN' : sent ? 'ALMOST THERE' : mode === 'signup' ? 'NEW HERE?' : mode === 'forgot' ? 'NO WORRIES' : 'WELCOME BACK';
  const heading = user ? `Hi, ${user.name?.split(' ')[0] || 'scout'}!` : sent ? 'Check your inbox.' : mode === 'signup' ? 'Join the scouts.' : mode === 'forgot' ? 'Forgot password?' : 'Sign in to scout.';
  const blurb = user
    ? `You're signed in as ${user.email || user.name}.`
    : sent ? ''
    : mode === 'signup' ? 'Create an account to save your sizes, wishlist and price alerts.'
    : mode === 'forgot' ? "Enter your email and we'll send you a reset link."
    : 'Save your finds, watch prices and get alerts when your favourites go on sale.';

  return (
    <main className="ssi">
      <div className="ssi-holo" aria-hidden="true" />
      <div className="ssi-deco" aria-hidden="true">
        <div className="ssi-cd ssi-cd1"><span /></div>
        <div className="ssi-cd ssi-cd2"><span /></div>
        <img className="ssi-camera" src={camera} alt="" />
        <img className="ssi-stickers" src={stickers} alt="" />
        <span className="ssi-star ssi-star1">✦</span>
        <span className="ssi-star ssi-star2">✦</span>
        <span className="ssi-star ssi-star3">✧</span>
      </div>

      <section className="ssi-entry" aria-labelledby="ssi-brand">
        <header className="ssi-brand">
          <img id="ssi-brand" src={logo} alt="StyleScout" />
          <p>find it. compare it. wear it.</p>
        </header>

        <section className="ssi-win">
          <header className="ssi-bar">
            <div className="ssi-title"><span>✦</span> {win}</div>
            <div className="ssi-ctl">
              <span aria-hidden="true">−</span>
              <span aria-hidden="true">□</span>
              <button type="button" aria-label="close and go home" onClick={() => nav('/home')}>×</button>
            </div>
          </header>

          <div className="ssi-body">
            <div className="ssi-welcome">
              <p className="ssi-eyebrow">{eyebrow}</p>
              <h1>{heading}</h1>
              {blurb && <p>{blurb}</p>}
            </div>

            {user ? (
              <div className="ssi-stack">
                <button className="ssi-primary" type="button" onClick={() => nav('/home')}><span>continue</span><b>→</b></button>
                <button className="ssi-guest" type="button" onClick={logout}>log out</button>
              </div>
            ) : sent ? (
              <div className="ssi-stack">
                {sent.type === 'verify' ? (
                  <>
                    <p className="ssi-note">
                      {sent.emailSent
                        ? <>We sent a verification link to <b>{sent.email}</b>. Click it to activate your account, then sign in. The link works for 24 hours.</>
                        : <>Your account was created, but we couldn&apos;t send the email right now. Tap resend to try again.</>}
                    </p>
                    {info && <p className="ssi-info" role="status">{info}</p>}
                    {error && <p className="ssi-msg" role="alert">{error}</p>}
                    <button className="ssi-guest" type="button" onClick={() => resend(sent.email)}>resend email ↻</button>
                  </>
                ) : (
                  <p className="ssi-note">If <b>{sent.email}</b> has an account, a reset link is on its way. It works for 1 hour. Check your spam folder too.</p>
                )}
                <button className="ssi-primary" type="button" onClick={() => { setSent(null); switchMode('login'); }}><span>back to sign in</span><b>→</b></button>
              </div>
            ) : (
              <>
                {mode !== 'forgot' && (
                  <div className="ssi-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>sign in</button>
                    <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>create account</button>
                  </div>
                )}

                <form className="ssi-form" onSubmit={submit} noValidate>
                  {mode === 'signup' && (
                    <>
                      <label htmlFor="ssi-name">Name</label>
                      <div className="ssi-field">
                        <span aria-hidden="true">☺</span>
                        <input id="ssi-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="your name" />
                      </div>
                    </>
                  )}

                  <label htmlFor="ssi-email">Email</label>
                  <div className="ssi-field">
                    <span aria-hidden="true">✉</span>
                    <input id="ssi-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
                  </div>

                  {mode !== 'forgot' && (
                    <>
                      <label htmlFor="ssi-pw">Password</label>
                      <div className="ssi-field">
                        <span aria-hidden="true">◆</span>
                        <input id="ssi-pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'signup' ? 'at least 8 characters' : '••••••••'} />
                        <button className="ssi-eye" type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((s) => !s)}>{showPw ? '◎' : '◉'}</button>
                      </div>
                    </>
                  )}

                  {mode === 'login' && (
                    <div className="ssi-row">
                      <label className="ssi-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>remember me</span></label>
                      <button type="button" className="ssi-link" onClick={() => switchMode('forgot')}>forgot password?</button>
                    </div>
                  )}

                  <div className="ssi-captcha"><Captcha ref={captchaRef} onChange={setCaptchaToken} /></div>

                  {unverified && (
                    <button type="button" className="ssi-guest ssi-resend" onClick={() => resend(email.trim().toLowerCase())}>resend verification email ↻</button>
                  )}

                  <button className="ssi-primary" type="submit" disabled={busy}>
                    <span>{busy ? 'please wait…' : mode === 'login' ? 'sign in' : mode === 'signup' ? 'create account' : 'send reset link'}</span><b>→</b>
                  </button>
                  <p className="ssi-msg" role="alert">{error}</p>
                  {info && <p className="ssi-info" role="status">{info}</p>}
                  {mode === 'forgot' && (
                    <button type="button" className="ssi-link ssi-center" onClick={() => switchMode('login')}>← back to sign in</button>
                  )}
                </form>

                {mode !== 'forgot' && (
                  <>
                    <div className="ssi-or"><span>or</span></div>
                    <button className="ssi-guest" type="button" onClick={() => nav('/home')}>continue as guest <span>↗</span></button>
                    <p className="ssi-guestnote">No account needed to search and compare. Sign in later to save things.</p>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
