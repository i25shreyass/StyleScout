import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../services/api';
import { Window, TopNav, Ticker, Footer } from '../components/Ui';
import './Login.css';

// Opened from the link in the reset email: /reset-password?token=...
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await resetPasswordRequest({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopNav />
      <main className="loginpage">
        <Window title="reset password" tone="pink" icon="♡" className="loginwin">
          <div className="lg-head">
            <div className="bubble big">{done ? 'all set!' : 'new password'}</div>
          </div>
          {!token ? (
            <div className="lg-signed">
              <p className="lg-msg">This link is missing its token. Request a new reset email.</p>
              <Link className="btn block" to="/login">go to log in</Link>
            </div>
          ) : done ? (
            <div className="lg-signed">
              <p className="lg-msg">your password was updated. you can log in with it now.</p>
              <Link className="btn block" to="/login">log in →</Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="lg-field">
                <span>new password</span>
                <div className="lg-pw">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="at least 8 characters" />
                  <button type="button" onClick={() => setShowPw((s) => !s)}>{showPw ? 'hide' : 'show'}</button>
                </div>
              </label>
              <label className="lg-field">
                <span>confirm password</span>
                <input type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="type it again" />
              </label>
              {error && <div className="lg-error" role="alert">{error}</div>}
              <button className="btn block" type="submit" disabled={busy}>{busy ? 'please wait…' : 'update password →'}</button>
            </form>
          )}
        </Window>
      </main>
      <Ticker />
      <Footer />
    </>
  );
}
