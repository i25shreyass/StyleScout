import React, { useEffect, useState } from 'react';
import logo from '../assets/intro/stylescout-chrome-logo.webp';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, ArrowLeftRight, Heart, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { looksLikeUrl } from '../services/api';

/* ---------- Window ----------
   Plain windows have a title bar only. Minimise / maximise / close buttons
   appear ONLY when `popup` is set (real pop-ups such as messages and dialogs). */
export function Window({ title, children, className = '', tone = 'blue', popup = false, onClose, icon = '✦', bar = true }) {
  return (
    <section className={`win ${tone === 'pink' ? 'pink' : ''} ${className}`}>
      {bar && (
        <div className="titlebar">
          <span className="tbicon" aria-hidden="true">{icon}</span>
          <b>{title}</b>
          {popup && (
            <span className="ctl">
              <i aria-hidden="true">_</i>
              <i aria-hidden="true">□</i>
              <button type="button" aria-label="close" onClick={onClose}>×</button>
            </span>
          )}
        </div>
      )}
      <div className="winbody">{children}</div>
    </section>
  );
}

/* ---------- Small global toast (a pop-up) ---------- */
export const toast = (message) => window.dispatchEvent(new CustomEvent('ss-toast', { detail: message }));

export function ToastHost() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let t;
    const onToast = (e) => {
      setMsg(e.detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2800);
    };
    window.addEventListener('ss-toast', onToast);
    return () => {
      window.removeEventListener('ss-toast', onToast);
      clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <Window title="new message!" tone="pink" popup icon="♡" onClose={() => setMsg(null)}>
        <div className="toastbody">
          <span className="bigheart">♥</span>
          <div><small>you have</small><b>{msg}</b></div>
          <button className="btn blue" onClick={() => setMsg(null)}>ok</button>
        </div>
      </Window>
    </div>
  );
}

/* ---------- Top navigation ---------- */
export function TopNav() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const go = (e) => {
    e.preventDefault();
    const v = q.trim();
    if (looksLikeUrl(v)) nav(`/search?link=${encodeURIComponent(v)}`);
    else nav(`/search${v ? `?q=${encodeURIComponent(v)}` : ''}`);
  };
  const items = [
    ['/home', 'home', Home],
    ['/search', 'search', Search],
    ['/compare', 'compare', ArrowLeftRight],
    ['/wishlist', 'wishlist', Heart],
    ['/alerts', 'alerts', Bell],
  ];
  const cls = ({ isActive }) => `navitem${isActive ? ' on' : ''}`;
  return (
    <header className="topnav">
      <Link className="brand brandlogo" to="/home" aria-label="StyleScout home"><img src={logo} alt="StyleScout" /></Link>
      <nav>
        {items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} className={cls}><Icon size={22} /><span>{label}</span></NavLink>
        ))}
        <NavLink to={user ? '/profile' : '/login'} className={cls}>
          <User size={22} /><span>{user ? user.name.split(' ')[0].toLowerCase() : 'log in'}</span>
        </NavLink>
      </nav>
      <form className="navsearch" onSubmit={go}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search or paste a link..." aria-label="search or paste a product link" />
        <button aria-label="search"><Search size={16} /></button>
      </form>
    </header>
  );
}

/* ---------- Decorations ---------- */
export const Phone = ({ className = '' }) => (
  <svg className={`deco ${className}`} viewBox="0 0 90 150" aria-hidden="true">
    <rect x="12" y="6" width="66" height="62" rx="14" fill="#f8a8d6" stroke="#2b2559" strokeWidth="3" />
    <rect x="22" y="16" width="46" height="36" rx="6" fill="#241a4d" />
    <path d="M45 44c-9-6-12-10-12-14a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 4-3 8-12 14z" fill="#ff7cc3" />
    <rect x="8" y="72" width="74" height="68" rx="16" fill="#f5c2e3" stroke="#2b2559" strokeWidth="3" />
    {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => (
      <circle key={`${r}${c}`} cx={28 + c * 17} cy={88 + r * 14} r="4.5" fill="#fff" stroke="#2b2559" strokeWidth="1.5" />
    )))}
  </svg>
);

export const Disc = ({ className = '' }) => <div className={`disc ${className}`} aria-hidden="true" />;
export const Sparkle = ({ className = '' }) => <span className={`spark ${className}`} aria-hidden="true">✦</span>;

/* ---------- Strips & footer ---------- */
export function Ticker() {
  const msg = '★ compare before you buy ♡ final price with delivery ★ direct store links ♡ your size, checked ★ price-drop alerts ♡ ';
  return (
    <div className="ticker" aria-hidden="true">
      <div className="track"><span>{msg.repeat(3)}</span><span>{msg.repeat(3)}</span></div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="checker" />
      <div className="footgrid">
        <div><img className="footlogo" src={logo} alt="StyleScout" /><small>© 2026 StyleScout · a college web-dev project. prices and stock come from each store and can change, so check the store page before you buy.</small></div>
        <div><b>explore</b><Link to="/search">search</Link><Link to="/compare">compare</Link><Link to="/wishlist">wishlist</Link></div>
        <div><b>account</b><Link to="/login">log in</Link><Link to="/profile">profile</Link><Link to="/alerts">price alerts</Link></div>
      </div>
    </footer>
  );
}
