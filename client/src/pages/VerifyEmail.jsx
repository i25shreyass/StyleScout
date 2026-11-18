import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmailRequest } from '../services/api';
import { Window, TopNav, Ticker, Footer } from '../components/Ui';
import './Login.css';

// Opened from the link in the verification email: /verify-email?token=...
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [msg, setMsg] = useState(token ? '' : 'This link is missing its token.');
  const started = useRef(false); // the token works once, so only call the API once

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmailRequest({ token })
      .then((d) => { setMsg(d.message); setState('ok'); })
      .catch((e) => { setMsg(e.message); setState('error'); });
  }, [token]);

  return (
    <>
      <TopNav />
      <main className="loginpage">
        <Window title="verify email" tone={state === 'error' ? 'pink' : 'blue'} icon="✉" className="loginwin">
          <div className="lg-head">
            <div className="bubble big">{state === 'loading' ? 'one sec…' : state === 'ok' ? 'verified!' : 'hmm…'}</div>
          </div>
          <div className="lg-signed">
            <p className="lg-msg">{state === 'loading' ? 'verifying your email…' : msg}</p>
            <Link className="btn block" to="/login">{state === 'ok' ? 'log in →' : 'go to log in'}</Link>
          </div>
        </Window>
      </main>
      <Ticker />
      <Footer />
    </>
  );
}
