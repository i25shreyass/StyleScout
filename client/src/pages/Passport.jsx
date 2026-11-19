import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  OPTIONS, usePassport, setPassportCache, updateProfileRequest, deleteProfileDataRequest,
  getHistoryRequest, deleteHistoryItemRequest, clearHistoryRequest,
} from '../services/passport';
import logo from '../assets/intro/stylescout-chrome-logo.webp';
import './Login.css';
import './Passport.css';

const SIZE_OPTS = {
  top: ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  bottom: ['', '26', '28', '30', '32', '34', '36', '38', '40', 'XS', 'S', 'M', 'L', 'XL'],
  shoe: ['', 'UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'],
};
const EMPTY = { shoppingFor: [], ageRange: '', budget: '', styles: [], colours: [], stores: [], brands: [], keepHistory: true, priceAlertEmails: true, newsEmails: false };

const ago = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

// Chip group: single choice (value is a string) or multi choice (value is an array).
function Chips({ options, value, onChange, multi = false, label }) {
  const on = (v) => (multi ? value.includes(v) : value === v);
  const flip = (v) => (multi ? onChange(on(v) ? value.filter((x) => x !== v) : [...value, v]) : onChange(on(v) ? '' : v));
  return (
    <div className="pp-chips" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={on(v) ? 'on' : ''} aria-pressed={on(v)} onClick={() => flip(v)}>{text}</button>
      ))}
    </div>
  );
}

function Section({ title, why, children }) {
  return (
    <fieldset className="pp-sec">
      <legend>{title}</legend>
      {why && <p className="pp-why">{why}</p>}
      {children}
    </fieldset>
  );
}

export default function Passport() {
  const { user, token, logout } = useAuth();
  const profile = usePassport();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const [tab, setTab] = useState(params.get('tab') || 'style'); // style | history | account

  const [name, setName] = useState('');
  const [sizes, setSizes] = useState({ top: '', bottom: '', shoe: '' });
  const [pp, setPp] = useState(EMPTY);
  const [brandText, setBrandText] = useState('');
  const [msg, setMsg] = useState({ text: '', bad: false });
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);

  // fill the form when the profile arrives
  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setSizes({ top: '', bottom: '', shoe: '', ...profile.sizes });
    const next = { ...EMPTY, ...profile.passport };
    setPp(next);
    setBrandText((next.brands || []).join(', '));
  }, [profile]);

  useEffect(() => {
    if (tab !== 'history' || !token) return;
    getHistoryRequest(token).then(setHistory).catch(() => setHistory([]));
  }, [tab, token]);

  const set = (k) => (v) => setPp((s) => ({ ...s, [k]: v }));
  const say = (text, bad = false) => setMsg({ text, bad });

  const save = async (extra = {}) => {
    setBusy(true); say('');
    try {
      const brands = brandText.split(',').map((b) => b.trim()).filter(Boolean);
      const p = await updateProfileRequest(token, { name, sizes, passport: { ...pp, brands, onboarded: true, ...extra } });
      setPassportCache(p);
      say('saved ♡ your results will now be personalised.');
      return true;
    } catch (e) {
      say(e.message, true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    try { setPassportCache(await updateProfileRequest(token, { passport: { onboarded: true } })); } catch { /* still let them through */ }
    nav('/home');
  };

  const wipe = async () => {
    if (!window.confirm('Delete your sizes, style preferences and search history? Your account and wishlist stay.')) return;
    try {
      const p = await deleteProfileDataRequest(token);
      setPassportCache(p);
      setHistory([]);
      say('your profile data was deleted.');
    } catch (e) { say(e.message, true); }
  };

  const removeHistory = async (id) => {
    setHistory((h) => h.filter((x) => x.id !== id));
    deleteHistoryItemRequest(token, id).catch(() => {});
  };
  const clearHistory = async () => {
    if (!window.confirm('Clear your whole search history?')) return;
    setHistory([]);
    clearHistoryRequest(token).catch(() => {});
  };
  const again = (h) => nav(h.kind === 'link' && h.link ? `/search?link=${encodeURIComponent(h.link)}` : `/search?q=${encodeURIComponent(h.query)}`);

  return (
    <main className="ssi pp">
      <div className="ssi-holo" aria-hidden="true" />
      <section className="ssi-entry pp-entry">
        <Link to="/home" className="pp-logo"><img src={logo} alt="StyleScout home" /></Link>

        <section className="ssi-win pp-win">
          <header className="ssi-bar">
            <div className="ssi-title"><span>✦</span> {welcome ? 'personalise.exe' : 'my_style_passport.exe'}</div>
            <div className="ssi-ctl">
              <span aria-hidden="true">−</span><span aria-hidden="true">□</span>
              <button type="button" aria-label="close and go home" onClick={() => nav('/home')}>×</button>
            </div>
          </header>

          <div className="ssi-body">
            {!user ? (
              <div className="ssi-stack">
                <div className="ssi-welcome"><p className="ssi-eyebrow">STYLE PASSPORT</p><h1>Sign in first.</h1><p>Your passport saves your sizes, budget and style so every search fits you.</p></div>
                <Link className="ssi-primary" to="/login"><span>sign in</span><b>→</b></Link>
              </div>
            ) : (
              <>
                <div className="ssi-welcome">
                  <p className="ssi-eyebrow">{welcome ? 'OPTIONAL · TAKES 30 SECONDS' : `HI ${(user.name || '').split(' ')[0].toUpperCase()}`}</p>
                  <h1>{welcome ? 'Personalise StyleScout ♡' : 'My Style Passport'}</h1>
                  <p>{welcome ? 'Tell us what you shop for. We use it to tick offers that fit your size, budget and style. Everything here is optional.' : 'Your sizes, budget, style, favourite stores and searches. Edit or delete anything, any time.'}</p>
                </div>

                {!welcome && (
                  <div className="ssi-tabs pp-tabs" role="tablist">
                    {[['style', 'my style'], ['history', 'search history'], ['account', 'account']].map(([k, t]) => (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); say(''); }}>{t}</button>
                    ))}
                  </div>
                )}

                {!profile ? <p className="ssi-note">loading your passport…</p> : (welcome || tab === 'style') ? (
                  <form className="pp-form" onSubmit={async (e) => { e.preventDefault(); if (await save() && welcome) nav('/home'); }}>
                    <Section title="who are you shopping for?" why="so we show women's, men's, unisex or kids' items first">
                      <Chips label="shopping for" multi options={OPTIONS.shoppingFor} value={pp.shoppingFor} onChange={set('shoppingFor')} />
                    </Section>

                    <Section title="your sizes" why="the heart of StyleScout: we check your size on store pages and remind you at checkout">
                      <div className="pp-sizes">
                        {[['top', 'top'], ['bottom', 'bottom'], ['shoe', 'shoes']].map(([k, t]) => (
                          <label key={k}><span>{t}</span>
                            <select value={sizes[k]} onChange={(e) => setSizes((s) => ({ ...s, [k]: e.target.value }))}>
                              {SIZE_OPTS[k].map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    </Section>

                    <Section title="your usual budget" why="offers within it get a ✓ and rank higher in “for you”">
                      <Chips label="budget" options={OPTIONS.budget} value={pp.budget} onChange={set('budget')} />
                    </Section>

                    <Section title="your vibe" why="pick as many as you like">
                      <Chips label="style" multi options={OPTIONS.styles} value={pp.styles} onChange={set('styles')} />
                    </Section>

                    <Section title="colours you love">
                      <div className="pp-swatches" role="group" aria-label="colours">
                        {OPTIONS.colours.map(([c, hex]) => {
                          const on = pp.colours.includes(c);
                          return (
                            <button key={c} type="button" className={on ? 'on' : ''} aria-pressed={on} title={c}
                              onClick={() => set('colours')(on ? pp.colours.filter((x) => x !== c) : [...pp.colours, c])}>
                              <i style={{ background: hex }} />{c}
                            </button>
                          );
                        })}
                      </div>
                    </Section>

                    <Section title="favourite stores" why="their offers get a ✓">
                      <div className="pp-checks">
                        {OPTIONS.stores.map(([v, t]) => (
                          <label key={v}><input type="checkbox" checked={pp.stores.includes(v)} onChange={(e) => set('stores')(e.target.checked ? [...pp.stores, v] : pp.stores.filter((x) => x !== v))} /> <span>{t}</span></label>
                        ))}
                      </div>
                    </Section>

                    <Section title="favourite brands" why="optional · separate with commas">
                      <div className="ssi-field"><span aria-hidden="true">★</span><input value={brandText} onChange={(e) => setBrandText(e.target.value)} placeholder="e.g. Levi's, H&M, Rare Rabbit" /></div>
                    </Section>

                    {!welcome && (
                      <Section title="age range" why="optional · helps age-appropriate suggestions">
                        <Chips label="age range" options={OPTIONS.ageRange} value={pp.ageRange} onChange={set('ageRange')} />
                      </Section>
                    )}

                    <button className="ssi-primary" type="submit" disabled={busy}><span>{busy ? 'saving…' : welcome ? 'save my style' : 'save changes'}</span><b>→</b></button>
                    {welcome && <button type="button" className="ssi-link ssi-center" onClick={skip}>skip for now</button>}
                    <p className={msg.bad ? 'ssi-msg' : 'ssi-info'} role="status">{msg.text}</p>
                  </form>
                ) : tab === 'history' ? (
                  <div className="pp-history">
                    {!pp.keepHistory && <p className="ssi-note">search history is turned off. turn it on in the account tab.</p>}
                    {history === null ? <p className="ssi-note">loading…</p> : !history.length ? (
                      <p className="ssi-note">no searches yet. your searches appear here so you can run them again in one tap.</p>
                    ) : (
                      <>
                        <ul>
                          {history.map((h) => (
                            <li key={h.id}>
                              <span className="pp-kind" aria-hidden="true">{h.kind === 'link' ? '🔗' : h.kind === 'photo' ? '📷' : '⌕'}</span>
                              <button type="button" className="pp-q" onClick={() => again(h)} title="search again">
                                <b>{h.query}</b>
                                <small>{h.kind === 'link' ? 'from a link · ' : ''}{h.results ? `${h.results} offers · ` : ''}{ago(h.at)}</small>
                              </button>
                              <button type="button" className="pp-x" aria-label={`remove ${h.query}`} onClick={() => removeHistory(h.id)}>×</button>
                            </li>
                          ))}
                        </ul>
                        <button type="button" className="ssi-guest" onClick={clearHistory}>clear all history</button>
                      </>
                    )}
                    <p className="ssi-guestnote">tap a search to run it again. saved searches are usually free (results are kept for 12 hours).</p>
                  </div>
                ) : (
                  <div className="pp-form">
                    <Section title="your details">
                      <label className="pp-label" htmlFor="pp-name">Name</label>
                      <div className="ssi-field"><span aria-hidden="true">☺</span><input id="pp-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
                      <label className="pp-label">Email</label>
                      <div className="ssi-field pp-readonly"><span aria-hidden="true">✉</span><input value={profile.email || ''} readOnly aria-readonly="true" /></div>
                    </Section>
                    <Section title="privacy & emails" why="you're in control. marketing emails stay off unless you turn them on.">
                      <div className="pp-toggles">
                        <label><input type="checkbox" checked={pp.keepHistory} onChange={(e) => set('keepHistory')(e.target.checked)} /> <span><b>save my search history</b><small>turning this off also deletes saved searches</small></span></label>
                        <label><input type="checkbox" checked={pp.priceAlertEmails} onChange={(e) => set('priceAlertEmails')(e.target.checked)} /> <span><b>price-drop alert emails</b><small>only for alerts you set</small></span></label>
                        <label><input type="checkbox" checked={pp.newsEmails} onChange={(e) => set('newsEmails')(e.target.checked)} /> <span><b>sale &amp; new-arrival emails</b><small>occasional, never shared</small></span></label>
                      </div>
                    </Section>
                    <button className="ssi-primary" type="button" disabled={busy} onClick={() => save()}><span>{busy ? 'saving…' : 'save changes'}</span><b>→</b></button>
                    <p className={msg.bad ? 'ssi-msg' : 'ssi-info'} role="status">{msg.text}</p>
                    <div className="ssi-or"><span>danger zone</span></div>
                    <div className="pp-danger">
                      <button type="button" className="ssi-guest" onClick={wipe}>delete my profile data</button>
                      <button type="button" className="ssi-guest" onClick={() => { logout(); nav('/login'); }}>log out</button>
                    </div>
                    <p className="ssi-guestnote">deleting profile data removes sizes, preferences and search history. your login and wishlist stay.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
