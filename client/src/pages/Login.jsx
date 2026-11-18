import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordRequest, resendVerificationRequest } from '../services/api';
import { Window, TopNav, Phone, Disc, Sparkle, Ticker, Footer } from '../components/Ui';
import Captcha from '../components/Captcha';
import './Login.css';

export default function Login() {
  const { user, login, signup, logout } = useAuth();
  const nav = useNavigate();
  const captchaRef = useRef(null);

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
        await login(email, password, captchaToken);
        nav('/home');
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

  const title = user ? 'welcome back' : sent ? 'check your email' : mode === 'login' ? 'log in' : mode === 'signup' ? 'sign up' : 'forgot password';
  const headline = user ? 'hi!' : sent ? 'check your inbox' : mode === 'login' ? 'welcome back' : mode === 'signup' ? 'join the club' : 'oops, forgot?';
  const sub = user
    ? `you're signed in as ${user.name}`
    : sent ? '' : mode === 'forgot' ? "enter your email and we'll send you a reset link ♡" : 'log in to save your wishlist and price alerts ♡';

  return (
    <>
      <TopNav />
      <main className="loginpage">
        <Phone className="lg-phone" />
        <Disc className="lg-disc" />
        <Sparkle className="s1" /><Sparkle className="s2" /><Sparkle className="s3" />

        {/* A log-in dialog is a pop-up, so it gets window buttons. The × takes you home. */}
        <Window title={title} tone="pink" popup icon="♡" className="loginwin" onClose={() => nav('/home')}>
          <div className="lg-head">
            <div className="bubble big">{headline}</div>
            {sub && <p>{sub}</p>}
          </div>

          {user ? (
            <div className="lg-signed">
              <button className="btn block" onClick={() => nav('/home')}>continue →</button>
              <button className="btn blue block" onClick={logout}>log out</button>
            </div>
          ) : sent ? (
            <div className="lg-signed">
              {sent.type === 'verify' ? (
                <>
                  <p className="lg-msg">
                    {sent.emailSent
                      ? <>we sent a verification link to <b>{sent.email}</b>. click it to activate your account, then log in. the link works for 24 hours.</>
                      : <>your account was created, but we couldn&apos;t send the email right now. tap resend below to try again.</>}
                  </p>
                  {info && <div className="lg-info" role="status">{info}</div>}
                  {error && <div className="lg-error" role="alert">{error}</div>}
                  <button className="btn blue block" onClick={() => resend(sent.email)}>resend email</button>
                </>
              ) : (
                <p className="lg-msg">if <b>{sent.email}</b> has an account, a reset link is on its way. it works for 1 hour. check your spam folder too.</p>
              )}
              <button className="btn block" onClick={() => { setSent(null); switchMode('login'); }}>back to log in</button>
            </div>
          ) : (
            <>
              {mode !== 'forgot' && (
                <div className="lg-tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>log in</button>
                  <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>sign up</button>
                </div>
              )}

              <form onSubmit={submit} noValidate>
                {mode === 'signup' && (
                  <label className="lg-field">
                    <span>name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="your name" />
                  </label>
                )}
                <label className="lg-field">
                  <span>email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@email.com" />
                </label>
                {mode !== 'forgot' && (
                  <label className="lg-field">
                    <span>password</span>
                    <div className="lg-pw">
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="at least 8 characters" />
                      <button type="button" onClick={() => setShowPw((s) => !s)}>{showPw ? 'hide' : 'show'}</button>
                    </div>
                  </label>
                )}
                {mode === 'login' && (
                  <button type="button" className="lg-link" onClick={() => switchMode('forgot')}>forgot password?</button>
                )}

                <Captcha ref={captchaRef} onChange={setCaptchaToken} />

                {error && <div className="lg-error" role="alert">{error}</div>}
                {info && <div className="lg-info" role="status">{info}</div>}
                {unverified && (
                  <button type="button" className="btn blue block lg-resend" onClick={() => resend(email.trim().toLowerCase())}>resend verification email</button>
                )}

                <button className="btn block" type="submit" disabled={busy}>
                  {busy ? 'please wait…' : mode === 'login' ? 'enter stylescout →' : mode === 'signup' ? 'create account →' : 'send reset link →'}
                </button>
                {mode === 'forgot' && (
                  <button type="button" className="lg-link center" onClick={() => switchMode('login')}>← back to log in</button>
                )}
              </form>
            </>
          )}
        </Window>
      </main>
      <Ticker />
      <Footer />
    </>
  );
}
