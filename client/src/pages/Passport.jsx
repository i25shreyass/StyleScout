import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Window, TopNav, Ticker, Footer } from '../components/Ui';
import {
  usePassport, setPassportCache, updateProfileRequest, deleteProfileDataRequest,
  getHistoryRequest, deleteHistoryItemRequest, clearHistoryRequest,
} from '../services/passport';
import PassportFields, { EMPTY_PASSPORT, EMPTY_SIZES, toPayload } from '../components/PassportFields';

const ago = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

// Profile page (regular site look): edit style preferences, see search history, account & privacy.
export default function Passport() {
  const { user, token, logout } = useAuth();
  const profile = usePassport();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'style'; // style | history | account
  const go = (t) => { setParams(t === 'style' ? {} : { tab: t }); setMsg({ text: '', bad: false }); };

  const [form, setForm] = useState({ sizes: EMPTY_SIZES, passport: EMPTY_PASSPORT, brandText: '' });
  const [name, setName] = useState('');
  const [msg, setMsg] = useState({ text: '', bad: false });
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const passport = { ...EMPTY_PASSPORT, ...profile.passport };
    setForm({ sizes: { ...EMPTY_SIZES, ...profile.sizes }, passport, brandText: (passport.brands || []).join(', ') });
    setName(profile.name || '');
  }, [profile]);

  useEffect(() => {
    if (tab !== 'history' || !token) return;
    setHistory(null);
    getHistoryRequest(token).then(setHistory).catch(() => setHistory([]));
  }, [tab, token]);

  const save = async () => {
    setBusy(true); setMsg({ text: '', bad: false });
    try {
      const body = toPayload(form);
      const p = await updateProfileRequest(token, { name, ...body, passport: { ...body.passport, onboarded: true } });
      setPassportCache(p);
      setMsg({ text: 'saved ♡ your results are now personalised.', bad: false });
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally {
      setBusy(false);
    }
  };
  const setToggle = (k) => (e) => setForm((f) => ({ ...f, passport: { ...f.passport, [k]: e.target.checked } }));

  const wipe = async () => {
    if (!window.confirm('Delete your sizes, style preferences and search history? Your account and wishlist stay.')) return;
    try {
      setPassportCache(await deleteProfileDataRequest(token));
      setHistory([]);
      setMsg({ text: 'your profile data was deleted.', bad: false });
    } catch (e) { setMsg({ text: e.message, bad: true }); }
  };
  const removeOne = (id) => { setHistory((h) => h.filter((x) => x.id !== id)); deleteHistoryItemRequest(token, id).catch(() => {}); };
  const clearAll = () => {
    if (!window.confirm('Clear your whole search history?')) return;
    setHistory([]);
    clearHistoryRequest(token).catch(() => {});
  };
  const again = (h) => nav(h.kind === 'link' && h.link ? `/search?link=${encodeURIComponent(h.link)}` : `/search?q=${encodeURIComponent(h.query)}`);

  if (!user) {
    return (
      <>
        <TopNav />
        <main className="page">
          <Window title="profile.exe" tone="pink" icon="☺">
            <div className="winpad" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <p className="lead" style={{ margin: 0 }}>log in to save your sizes, budget, style and search history ♡</p>
              <Link className="btn" to="/login">log in →</Link>
            </div>
          </Window>
        </main>
        <Ticker />
        <Footer />
      </>
    );
  }

  return (
    <>
      <TopNav />
      <main className="page profpage">
        <Window title="my_account" className="profside" icon="☺">
          <div className="who">
            <div className="avatar">😎</div>
            <b>{profile?.name || user.name}</b>
            <small>{profile?.email || user.email}</small>
          </div>
          <nav aria-label="profile sections">
            <button type="button" className={tab === 'style' ? 'on' : ''} onClick={() => go('style')}>✦ my style passport</button>
            <button type="button" className={tab === 'history' ? 'on' : ''} onClick={() => go('history')}>⌕ search history</button>
            <button type="button" className={tab === 'account' ? 'on' : ''} onClick={() => go('account')}>⚙ account &amp; privacy</button>
            <Link to="/wishlist">♡ my wishlist</Link>
            <Link to="/compare">↔ compare</Link>
            <Link to="/alerts">🔔 price alerts</Link>
            <button type="button" onClick={() => { logout(); nav('/login'); }}>↩ log out</button>
          </nav>
        </Window>

        <div className="profmain">
          {!profile ? (
            <Window title="loading.exe" icon="⌛"><div className="winpad"><p className="lead">loading your profile…</p></div></Window>
          ) : tab === 'style' ? (
            <Window title="my_style_passport.exe" tone="pink" icon="✦">
              <div className="winpad">
                <p className="lead">your sizes, budget, style and favourite stores. we use these to tick offers that fit you and to power the “for you ♡” sort.</p>
                <PassportFields skin="site" value={form} onChange={setForm} />
                <div className="profactions">
                  <button className="btn" type="button" disabled={busy} onClick={save}>{busy ? 'saving…' : 'save changes'}</button>
                  {msg.text && <span className={`profmsg${msg.bad ? ' bad' : ''}`} role="status">{msg.text}</span>}
                </div>
              </div>
            </Window>
          ) : tab === 'history' ? (
            <Window title="search_history.exe" icon="⌕">
              <div className="winpad">
                {form.passport.keepHistory === false && <div className="banner soft">search history is turned off. turn it on in account &amp; privacy.</div>}
                {history === null ? <p className="lead">loading…</p> : !history.length ? (
                  <p className="lead">no searches yet. your searches appear here so you can run them again in one tap.</p>
                ) : (
                  <>
                    <ul className="histlist">
                      {history.map((h) => (
                        <li key={h.id}>
                          <span className="k" aria-hidden="true">{h.kind === 'link' ? '🔗' : h.kind === 'photo' ? '📷' : '⌕'}</span>
                          <button type="button" className="q" onClick={() => again(h)} title="search again">
                            <b>{h.query}</b>
                            <small>{h.kind === 'link' ? 'from a link · ' : h.kind === 'photo' ? 'photo search · ' : ''}{h.results ? `${h.results} offers · ` : ''}{ago(h.at)}</small>
                          </button>
                          <button type="button" className="x" aria-label={`remove ${h.query}`} onClick={() => removeOne(h.id)}>×</button>
                        </li>
                      ))}
                    </ul>
                    <div className="profactions">
                      <button type="button" className="btn blue tiny" onClick={clearAll}>clear all history</button>
                      <small style={{ opacity: 0.7 }}>tap a search to run it again. saved results are free for 12 hours.</small>
                    </div>
                  </>
                )}
              </div>
            </Window>
          ) : (
            <>
              <Window title="account.exe" icon="⚙">
                <div className="winpad">
                  <label className="proffield">name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                  <label className="proffield">email<input value={profile.email || ''} readOnly aria-readonly="true" /></label>
                  <div className="proftoggles">
                    <label><input type="checkbox" checked={form.passport.keepHistory !== false} onChange={setToggle('keepHistory')} /> <span><b>save my search history</b><small>turning this off also deletes saved searches</small></span></label>
                    <label><input type="checkbox" checked={form.passport.priceAlertEmails !== false} onChange={setToggle('priceAlertEmails')} /> <span><b>price-drop alert emails</b><small>only for alerts you set</small></span></label>
                    <label><input type="checkbox" checked={Boolean(form.passport.newsEmails)} onChange={setToggle('newsEmails')} /> <span><b>sale &amp; new-arrival emails</b><small>off unless you turn it on · never shared</small></span></label>
                  </div>
                  <div className="profactions">
                    <button className="btn" type="button" disabled={busy} onClick={save}>{busy ? 'saving…' : 'save changes'}</button>
                    {msg.text && <span className={`profmsg${msg.bad ? ' bad' : ''}`} role="status">{msg.text}</span>}
                  </div>
                </div>
              </Window>
              <Window title="danger_zone.exe" tone="pink" icon="!">
                <div className="winpad">
                  <p className="lead">deleting profile data removes your sizes, style preferences and search history. your login and wishlist stay.</p>
                  <div className="profactions"><button className="btn blue" type="button" onClick={wipe}>delete my profile data</button></div>
                </div>
              </Window>
            </>
          )}
        </div>
      </main>
      <Ticker />
      <Footer />
    </>
  );
}
