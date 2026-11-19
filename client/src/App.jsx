import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2, Plus, Search, ChevronRight, Truck, Tag, Globe, Camera } from 'lucide-react';
import { demoProducts, score } from './data';
import Login from './pages/Login';
import { searchRequest, readLinkRequest, looksLikeUrl, looksLikeImageUrl, imageSearchRequest, shrinkImage, getSizesRequest, saveSizesRequest, offersRequest, sizeStockRequest, reportRequest } from './services/api';
import VerifyEmail from './pages/VerifyEmail';
import WishlistPage from './pages/Wishlist';
import SaveButton from './components/SaveButton';
import Passport from './pages/Passport';
import { usePassport, fitFor, recordSearch, getHistoryRequest } from './services/passport';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './context/AuthContext';
import { Window, TopNav, ToastHost, toast, Phone, Disc, Sparkle, Ticker, Footer } from './components/Ui'; 
import CompareButton from './components/CompareButton';
import ComparePage from './pages/Compare';
import ProductHistory from './pages/ProductHistory';

/* ---------- helpers ---------- */
const money = (n, c = 'INR') => new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
const getIds = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const addId = (k, id, max = 99) => {
  const a = getIds(k);
  if (!a.includes(id) && a.length < max) a.push(id);
  localStorage.setItem(k, JSON.stringify(a));
};
const colorKey = (c) => { const x = c.toLowerCase(); return x === 'lavender' ? 'purple' : x; };
const COLORS = [['pink', '#ff6fb9'], ['black', '#17132f'], ['white', '#ffffff'], ['blue', '#5aa0ff'], ['yellow', '#ffe14d'], ['purple', '#a96bff']];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const Page = ({ children, className = '' }) => (
  <>
    <TopNav />
    <main className={`page ${className}`}>{children}</main>
    <Ticker />
    <Footer />
  </>
);

// Adds the site menu, ticker and footer around pages that bring their own <main>.
const WithNav = ({ children }) => (
  <>
    <TopNav />
    {children}
    <Ticker />
    <Footer />
  </>
);

/* ---------- landing ---------- */
function Landing() {
  const nav = useNavigate();
  return (
    <main className="landing">
      <Window title="stylescout.exe" className="landingwin">
        <div className="landinginner">
          <Phone className="lphone" />
          <div className="lcenter">
            <div className="bubble huge">StyleScout<span>✦</span></div>
            <p className="tagline">find • compare • style</p>
            <button className="press" onClick={() => nav('/home')}>press<br /><span>start</span></button>
          </div>
          <Disc className="ldisc" />
          <Sparkle className="s1" /><Sparkle className="s2" /><Sparkle className="s3" />
        </div>
      </Window>
    </main>
  );
}

/* ---------- home ---------- */
function Home() {
  const nav = useNavigate();
  const [msg, setMsg] = useState(true);
  const arrivals = demoProducts.slice(0, 3);
  const drops = [...demoProducts].sort((a, b) => b.discount - a.discount).slice(0, 7);
  const links = [['new arrivals', '/search'], ['best deals', '/search'], ['women', '/search?aud=women'], ['men', '/search?aud=men'], ['kids', '/search?aud=kids'], ['unisex', '/search?aud=unisex']];
  return (
    <Page className="home">
      <div className="homegrid">
        <Window title="quick links" className="quick" icon="☰">
          <ul>{links.map(([l, to]) => <li key={l}><Link to={to}>{l}<ChevronRight size={15} /></Link></li>)}</ul>
        </Window>

        <div className="hero">
          <div className="herocopy">
            <h1 className="bubble big">find it.<br />compare it.<br />wear it.</h1>
            <p>y2k fashion, digital dreams, and the best price. upload a look you love and scout it across stores.</p>
            <div className="row">
              <button className="btn" onClick={() => nav('/search')}>start scouting →</button>
              <button className="btn blue" onClick={() => nav('/compare')}>compare prices</button>
            </div>
          </div>
          <div className="herophoto">
            <Window title="cute.jpg" tone="pink" icon="◐"><img src={demoProducts[0].image} alt={demoProducts[0].name} /></Window>
            <Disc className="hdisc" /><Sparkle className="s1" /><Sparkle className="s2" />
          </div>
        </div>

        <aside className="side">
          {msg && (
            <Window title="new message!" tone="pink" popup icon="♡" onClose={() => setMsg(false)}>
              <div className="toastbody"><span className="bigheart">♥</span><div><small>you have</small><b>(1) new deal · up to 49% off</b></div></div>
              <button className="btn blue block" onClick={() => setMsg(false)}>ok</button>
            </Window>
          )}
          <Window title="now playing" tone="pink" icon="♫" className="player">
            <b>StyleScout Mix</b>
            <div className="bars" aria-hidden="true">▂▅▃▇▆▂▅▃▇▅</div>
            <small>00:42 / 03:21</small>
          </Window>
        </aside>
      </div>

      <div className="perks">
        <span><Truck size={22} /> <b>compare delivery</b> days &amp; fees</span>
        <span><Tag size={22} /> <b>best deal score</b> on every item</span>
        <span><Globe size={22} /> <b>6 stores</b> one search</span>
      </div>

      <div className="trio">
        <Window title="new arrivals" icon="♡" className="arrivals">
          <div className="minis">
            {arrivals.map((p) => (
              <Link to={`/product/${p.id}`} key={p.id} className="mini">
                <img src={p.image} alt={p.name} />
                <b>{p.name}</b><small>{money(p.price)} · {p.platform}</small>
                <span className="btn tiny">view deal →</span>
              </Link>
            ))}
          </div>
        </Window>

        <Window title="price drops" tone="pink" icon="★" className="playlist">
          <ol>
            {drops.map((p, i) => (
              <li key={p.id} className={i === 1 ? 'hot' : ''}>
                <Link to={`/product/${p.id}`}><i>{String(i + 1).padStart(2, '0')}</i><span>{p.name}</span><em>{p.discount}% off</em></Link>
              </li>
            ))}
          </ol>
        </Window>

        <Window title="my faves" icon="☆" className="faves">
          <ul>
            <li><Link to="/wishlist">♥ saved items <b>{getIds('wishlist').length}</b></Link></li>
            <li><Link to="/compare">↔ comparing <b>{getIds('compare').length}</b></Link></li>
            <li><Link to="/alerts">♫ price alerts</Link></li>
            <li><Link to="/profile">☺ my account</Link></li>
          </ul>
        </Window>
      </div>
    </Page>
  );
}

/* ---------- search ---------- */
function Filters({ f }) {
  const { aud, setAud, platform, setPlatform, sizes, colors, toggle, cap, setCap, maxP, reset } = f;
  const stores = ['all', ...new Set(demoProducts.map((p) => p.platform))];
  const chip = (on, label, onClick) => (
    <button type="button" key={label} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{label}</button>
  );
  return (
    <Window title="✦ FILTERS.exe" tone="pink" className="filters" icon="⚙">
      <b>category</b>
      <div className="chips">{['all', 'women', 'men', 'kids', 'unisex'].map((x) => chip(aud === x, x, () => setAud(x)))}</div>
      <b>size</b>
      <div className="chips">{SIZES.map((x) => chip(sizes.includes(x), x, () => toggle('sizes', x)))}</div>
      <b>color</b>
      <div className="dots">
        {COLORS.map(([k, hex]) => (
          <button type="button" key={k} title={k} aria-label={k} aria-pressed={colors.includes(k)} className={colors.includes(k) ? 'on' : ''} style={{ background: hex }} onClick={() => toggle('colors', k)} />
        ))}
      </div>
      <b>stores</b>
      <div className="chips">{stores.map((x) => chip(platform === x, x, () => setPlatform(x)))}</div>
      <b>max price <em>{money(cap)}</em></b>
      <input type="range" min="300" max={maxP} step="50" value={cap} onChange={(e) => setCap(Number(e.target.value))} />
      <button className="btn block" onClick={reset}>reset</button>
    </Window>
  );
}

function ProductCard({ p, currency = 'INR' }) {
  const nav = useNavigate();
  return (
    <Window title={`${p.category}.jpg`} className="product" icon="◐">
      <div className="productpic" onClick={() => nav(`/product/${p.id}`)}>
        <img src={p.image} alt={p.name} />
        <button className="heart" aria-label="save to wishlist" onClick={(e) => { e.stopPropagation(); addId('wishlist', p.id); toast('saved to wishlist ♡'); }}>♥</button>
        {score(p) >= 90 && <span className="burst">BEST<br />DEAL</span>}
      </div>
      <div className="pbody">
        <b>{p.name}</b>
        <div className="storeline"><strong>{p.platform}</strong><span>★ {p.rating}</span></div>
        <div className="price"><strong>{money(p.price, currency)}</strong><s>{money(p.originalPrice, currency)}</s><mark>{p.discount}% OFF</mark></div>
        <small>similarity: {p.similarity}%</small>
        <div className="sizes">{p.sizes.slice(0, 5).map((s) => <span key={s}>{s}</span>)}</div>
        <button className="btn block" onClick={() => nav(`/product/${p.id}`)}>view deal ↗</button>
      </div>
    </Window>
  );
}

const LINK_KEY = 'ss_link_source';
const normQ = (q) => String(q || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
const readLinkSource = (q) => { try { const d = JSON.parse(sessionStorage.getItem(LINK_KEY)); return d && d.query === normQ(q) ? d.source : null; } catch { return null; } };
const STOP = new Set(['men', 'women', 'and', 'the', 'for', 'with', 'of']);
// Compares a result with the item from the pasted link.
function matchInfo(p, source, query) {
  if (!source) return null;
  const title = p.title.toLowerCase();
  const words = query.split(' ').filter((w) => w.length > 1 && !STOP.has(w));
  const overlap = words.length ? words.filter((w) => title.includes(w)).length / words.length : 0;
  const brand = (source.brand || query.split(' ')[0] || '').toLowerCase();
  const same = (!brand || title.includes(brand)) && overlap >= 0.75;
  const saving = source.price ? Math.round(source.price - (p.finalPrice ?? p.price)) : null;
  return { same, saving };
}

/* ---------- Sprint 4: my size, freshness ---------- */
const SIZE_KEY = 'ss_sizes';
const EMPTY_SIZES = { top: '', bottom: '', shoe: '' };
const readSizes = () => { try { return { ...EMPTY_SIZES, ...JSON.parse(localStorage.getItem(SIZE_KEY) || '{}') }; } catch { return EMPTY_SIZES; } };
// Saved in the browser always, and in the account when logged in.
function useSizes() {
  const { token } = useAuth();
  const [sizes, setSizes] = useState(readSizes);
  useEffect(() => {
    if (!token) return undefined;
    let dead = false;
    getSizesRequest(token).then((s) => {
      if (dead || !s) return;
      const merged = { ...readSizes() };
      for (const k of Object.keys(EMPTY_SIZES)) if (s[k]) merged[k] = s[k];
      localStorage.setItem(SIZE_KEY, JSON.stringify(merged));
      setSizes(merged);
    }).catch(() => {});
    return () => { dead = true; };
  }, [token]);
  const save = (next) => {
    setSizes(next);
    localStorage.setItem(SIZE_KEY, JSON.stringify(next));
    if (token) saveSizesRequest(token, next).then(() => toast('size saved to your account ♡')).catch(() => toast('saved on this device only'));
    else toast('size saved on this device. log in to keep it everywhere ♡');
  };
  return [sizes, save];
}
const SHOE_WORDS = /\b(shoe|shoes|sneaker|sneakers|sandal|sandals|heels?|boots?|loafers?|flats|slippers?|flip ?flops?|footwear|juttis?|mojaris?)\b/i;
const BOTTOM_WORDS = /\b(jeans|pants?|trousers?|cargos?|joggers?|shorts|skirts?|leggings|palazzos?|chinos|track ?pants|salwar|sharara|bottoms?)\b/i;
const sizeFor = (title, s) => (SHOE_WORDS.test(title) ? ['shoe', s.shoe] : BOTTOM_WORDS.test(title) ? ['bottom', s.bottom] : ['top', s.top]);
const ago = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};
const SIZE_OPTS = {
  top: ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  bottom: ['', '26', '28', '30', '32', '34', '36', '38', '40', 'XS', 'S', 'M', 'L', 'XL'],
  shoe: ['', 'UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'],
};
function SizePicker({ sizes, onSave }) {
  const set = (k, v) => onSave({ ...sizes, [k]: v });
  return (
    <div className="sizepick">
      <b>my size</b>
      {[['top', 'tops'], ['bottom', 'bottoms'], ['shoe', 'shoes']].map(([k, label]) => (
        <label key={k}><span>{label}</span>
          <select value={sizes[k]} onChange={(e) => set(k, e.target.value)} aria-label={`my ${label} size`}>
            {SIZE_OPTS[k].map((o) => <option key={o} value={o}>{o || '—'}</option>)}
          </select>
        </label>
      ))}
      <small>we remind you on every offer. stores don&apos;t share stock by size, so check it on the store page.</small>
    </div>
  );
}

// For photo results we can't compare words, only the price of the item the photo came from (if any).
const photoMatch = (p, src) => ({ same: false, hideTag: true, saving: src?.price ? Math.round(src.price - (p.finalPrice ?? p.price)) : null });

// "view at store": a normal link that always opens in a new tab.
// For Google results it goes through our server, which finds the store's own page
// (first click on a product = 1 search, then saved) and redirects there.
const storeHref = (p) => {
  if (!p.url) return null;
  if (!p.id.startsWith('g-') && !p.token) return p.url;          // photo results already link to the store
  const qs = new URLSearchParams({ productId: p.id, store: p.store, fallback: p.url });
  if (p.token) qs.set('token', p.token);
  return `${import.meta.env.VITE_API_URL ?? ''}/api/search/go?${qs}`;
};

function StoreButton({ p }) {
  const href = storeHref(p);
  if (!href) return <span className="btn block blue">link unavailable</span>;
  return <a className="btn block" href={href} target="_blank" rel="noopener noreferrer">view at store ↗</a>;
}

/* ---------- Sprint 6: all stores for this exact item ---------- */
const SIZE_LABEL = { in: ['in stock', 'ok'], out: ['sold out', 'bad'], 'not offered': ['not offered', 'bad'], unknown: ['check at store', 'unknown'] };

// Brand guess from a product title: its first word, unless that's a generic word.
const NOT_BRANDS = new Set(['man', 'woman', 'men', 'mens', "men's", 'women', 'womens', "women's", 'unisex', 'boys', 'girls', 'kids', 'the', 'a', 'new', 'solid', 'washed', 'regular', 'slim', 'oversized', 'printed', 'casual', 'denim', 'cotton', 'blue', 'black', 'white', 'dark', 'light', 'full', 'half', 'classic', 'premium', 'stylish', 'trendy', 'latest']);
function brandOf(title) {
  const w = String(title || '').trim().split(/\s+/)[0] || '';
  const clean = w.replace(/[^A-Za-z0-9&'.-]/g, '');
  if (clean.length < 2 || NOT_BRANDS.has(clean.toLowerCase())) return null;
  return clean.toUpperCase() === clean ? clean[0] + clean.slice(1).toLowerCase() : clean;
}

// Word overlap between two product names (0..1), for the "name looks different" warning.
const nameWords = (t) => new Set(String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['men', 'mens', 'women', 'womens', 'for', 'the', 'and', 'with'].includes(w)));
const nameOverlap = (a, b) => {
  const A = nameWords(a); const B = nameWords(b);
  if (!A.size || !B.size) return 1;
  let n = 0; A.forEach((w) => { if (B.has(w)) n += 1; });
  return n / Math.min(A.size, B.size);
};

function ReportBox({ p, offers }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('wrong item');
  const [note, setNote] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [done, setDone] = useState('');
  if (done) return <p className="reportdone">{done}</p>;
  if (!open) return <button type="button" className="linkbtn" onClick={() => setOpen(true)}>⚑ report wrong match or price</button>;
  const send = async (e) => {
    e.preventDefault();
    const o = offers.find((x) => x.url === storeUrl);
    try {
      const d = await reportRequest({ reason, note, productId: p.id, title: p.title, store: o?.store || p.store, url: o?.url || '', price: o?.price || p.price });
      setDone(d.message || 'thanks! ♡');
    } catch (err) { setDone(err.message); }
  };
  return (
    <form className="reportbox" onSubmit={send}>
      <b>what&apos;s wrong?</b>
      <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="reason">
        {['wrong item', 'wrong price', 'broken link', 'size info wrong', 'other'].map((r) => <option key={r}>{r}</option>)}
      </select>
      <select value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} aria-label="which store">
        <option value="">any / all stores</option>
        {offers.map((o) => <option key={o.url} value={o.url}>{o.store}</option>)}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional note" maxLength={300} aria-label="note" />
      <button className="btn tiny" type="submit">send</button>
    </form>
  );
}

function StoresPanel({ p, mySize, kind, onClose }) {
  const [state, setState] = useState({ loading: true });
  const [stock, setStock] = useState({});           // url -> size-reader reply ('loading' while checking)
  const [img, setImg] = useState(0);
  useEffect(() => {
    let dead = false;
    offersRequest({ productId: p.id, token: p.token })
      .then((d) => { if (!dead) setState(d); })
      .catch((e) => { if (!dead) setState({ error: e.message }); });
    return () => { dead = true; };
  }, [p.id, p.token]);

  // Read each store's own page (free): sizes in stock + description/colours/material where shared. 3 at a time.
  useEffect(() => {
    if (!state.offers?.length) return undefined;
    let dead = false;
    const urls = state.offers.map((o) => o.url);
    setStock(Object.fromEntries(urls.map((u) => [u, 'loading'])));
    (async () => {
      for (let i = 0; i < urls.length; i += 3) {
        const part = await Promise.all(urls.slice(i, i + 3).map((u) => sizeStockRequest(u, mySize || '').then((d) => [u, d]).catch(() => [u, { status: 'unknown', mine: 'unknown' }])));
        if (dead) return;
        setStock((s) => ({ ...s, ...Object.fromEntries(part) }));
      }
    })();
    return () => { dead = true; };
  }, [state.offers, mySize]);

  const offers = state.offers || [];
  const product = state.product || {};
  const statusOf = (o) => (typeof stock[o.url] === 'object' ? stock[o.url].mine : stock[o.url]);
  const best = offers.find((o) => o.youPay !== null && (!mySize || statusOf(o) !== 'out')) || null;
  const pageInfo = Object.values(stock).find((d) => typeof d === 'object' && d.details) || null;
  const det = pageInfo?.details || {};
  const images = (product.images?.length ? product.images : [p.image]).filter(Boolean);
  const allSizes = Object.values(stock).find((d) => typeof d === 'object' && d.status === 'ok')?.sizes || [];
  const description = product.description || det.description;
  const colours = product.colours?.length ? product.colours : det.colours || [];

  return (
    <div className="popwrap storespop" role="dialog" aria-label="all stores for this item" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Window title="all_stores.exe" tone="pink" icon="⇄" popup onClose={onClose}>
        <div className="storeshead">
          <div className="gallery">
            {images[img] && <img src={images[img]} alt={p.title} />}
            {images.length > 1 && <div className="thumbs">{images.slice(0, 6).map((u, i) => <button type="button" key={u} className={i === img ? 'on' : ''} onClick={() => setImg(i)} aria-label={`photo ${i + 1}`}><img src={u} alt="" /></button>)}</div>}
          </div>
          <div className="headinfo">
            {product.brand && <small className="brandtag">{product.brand}</small>}
            <b>{product.title || p.title}</b>
            {product.rating ? <small>★ {product.rating}{product.reviews ? ` (${product.reviews} reviews)` : ''}</small> : null}
            <small>{mySize ? <>your {kind} size: <b>{mySize}</b></> : <>set your {kind} size in filters to check stock</>}</small>
            <small className="why">grouped as the same product by Google Shopping · always check the store page before buying</small>
          </div>
        </div>

        {state.loading ? <p className="lg-msg">finding every store for this item… (uses 1 search the first time)</p>
          : state.error ? <p className="lg-msg">{state.error}</p>
          : !offers.length ? <p className="lg-msg">no other stores found for this exact item.</p>
          : (
            <>
              {best && <p className="storesverdict">lowest you pay{mySize ? ' in your size' : ''}: <b>{money(best.youPay)}</b> at {best.store}</p>}
              <div className="storestable" role="table">
                <div className="srow shead" role="row">
                  <span>store</span><span>item</span><span>delivery</span><span>you pay</span><span>{mySize ? `size ${mySize}` : 'sizes'}</span><span>returns</span><span />
                </div>
                {offers.map((o) => {
                  const d = stock[o.url];
                  const st = d === 'loading' ? ['checking…', 'unknown'] : SIZE_LABEL[typeof d === 'object' ? d.mine : 'unknown'];
                  const differs = o.listingTitle && nameOverlap(o.listingTitle, product.title || p.title) < 0.5;
                  const sizesHere = typeof d === 'object' && d.status === 'ok' ? d.sizes : null;
                  return (
                    <div className={`srow${best && o.url === best.url ? ' best' : ''}`} role="row" key={o.url}>
                      <span><b>{o.store}</b>{o.rating ? <small>★ {o.rating}{o.reviews ? ` (${o.reviews})` : ''}</small> : null}
                        {differs && <small className="warnname" title={o.listingTitle}>⚠ name differs: check it&apos;s the same item</small>}</span>
                      <span>{money(o.price)}{o.originalPrice && <s>{money(o.originalPrice)}</s>}</span>
                      <span>{o.delivery === null ? <em>check at store</em> : o.delivery === 0 ? 'free' : money(o.delivery)}</span>
                      <span>{o.youPay !== null ? <><b>{money(o.youPay)}</b><small>{o.verified ? 'total from store' : 'estimated'}</small></> : <em>item + delivery</em>}</span>
                      <span>
                        {mySize ? <span className={`stock ${st?.[1] || 'unknown'}`}>{st?.[0] || 'check at store'}</span> : null}
                        {sizesHere ? <small className="sizelist">{sizesHere.map((z) => <i key={z.size} className={z.available ? 'in' : 'out'}>{z.size}</i>)}</small>
                          : !mySize ? <em>{d === 'loading' ? 'checking…' : 'check at store'}</em> : null}
                      </span>
                      <span className="returns">{o.returns || <em>see store</em>}</span>
                      <span><a className="btn tiny" href={o.url} target="_blank" rel="noopener noreferrer">visit ↗</a></span>
                    </div>
                  );
                })}
              </div>

              {(description || colours.length || det.material || product.features?.length || allSizes.length) ? (
                <div className="proddetails">
                  <b>product details</b>
                  {description && <p>{description}</p>}
                  {product.features?.length ? <ul>{product.features.map((f) => <li key={f}>{f}</li>)}</ul> : null}
                  <div className="facts">
                    {det.material && <span><em>material</em>{det.material}</span>}
                    {colours.length ? <span><em>colours</em>{colours.join(', ')}</span> : null}
                    {(product.sizes?.length || allSizes.length) ? <span><em>sizes</em>{(product.sizes?.length ? product.sizes : allSizes.map((z) => z.size)).join(', ')}</span> : null}
                  </div>
                  {pageInfo && <small>size stock and details read from the store&apos;s own page.</small>}
                </div>
              ) : null}

              {product.similar?.length ? (
                <div className="similarrow">
                  <b>similar items</b>
                  <div>{product.similar.slice(0, 5).map((m) => (
                    <Link key={m.title} to={`/search?q=${encodeURIComponent(m.title)}`} onClick={onClose} className="simcard">
                      {m.image && <img src={m.image} alt="" />}
                      <span>{m.title}</span>
                      {m.price ? <b>{money(m.price)}</b> : null}
                    </Link>
                  ))}</div>
                </div>
              ) : null}

              <div className="storesfoot">
                <p className="disclaimer">{offers.length} store{offers.length > 1 ? 's' : ''} · checked {ago(state.fetchedAt)}{state.cached ? ' (saved, free)' : ''}. coupons and card offers aren&apos;t included.</p>
                <ReportBox p={p} offers={offers} />
              </div>
            </>
          )}
      </Window>
    </div>
  );
}

function StoresButton({ p, mySize, kind }) {
  const [open, setOpen] = useState(false);
  if (!p.id?.startsWith('g-') && !p.token) return null;
  return (
    <>
      <button type="button" className="btn block storesbtn" onClick={() => setOpen(true)}>⇄ all stores for this item</button>
      {open && <StoresPanel p={p} mySize={mySize} kind={kind} onClose={() => setOpen(false)} />}
    </>
  );
}

function LiveCard({ p, match, avg, sizes, fetchedAt, query = '', fit }) {
  const eff = p.finalPrice ?? p.price;
  const below = avg ? Math.round(avg - eff) : 0;
  const [kind, mySize] = sizeFor(
    p.title,
    sizes || EMPTY_SIZES
  );

  return (
    <Window title={`${p.store.toLowerCase().replace(/\s+/g, '')}.jpg`} className="product" icon="◐">
      <div className="picwrap">
      <a className="productpic" href={storeHref(p) || '#'} target="_blank" rel="noopener noreferrer">
        {p.image ? <img src={p.image} alt={p.title} loading="lazy" /> : <div className="noimg">no image</div>}
        {p.belowTypical >= 15 && <span className="burst">GOOD<br />DEAL</span>}
        {match && !match.hideTag && <span className={`matchtag${match.same ? ' same' : ''}`}>{match.same ? 'likely same item' : 'similar'}</span>}
        {p.visual && <span className="matchtag">look-alike</span>}
      </a>
      <SaveButton product={{ ...p, url: storeHref(p) || p.url }} query={query} />
      </div>
      <div className="pbody">
        <b
          className="ptitle"
          title={p.title}
        >
          {p.title}
        </b>

        <div className="storeline">
          <strong>{p.store}</strong>

          {p.rating && (
            <span>
              ★ {p.rating}
              {p.reviews
                ? ` (${p.reviews})`
                : ''}
            </span>
          )}
        </div>

        {p.finalPrice !== null ? (
          <div className="finalbig">
            <small>you pay</small>

            <strong>
              {money(p.finalPrice)}
            </strong>

            <span>
              {money(p.price)} item{' '}
              {p.delivery === 0
                ? '+ free delivery'
                : `+ ${money(
                    p.delivery
                  )} delivery`}
            </span>
          </div>
        ) : (
          <div
            className="finalbig unknown"
            title="This store didn't share a delivery fee. The total may be higher at checkout."
          >
            <small>item price</small>

            <strong>
              {money(p.price)}
            </strong>

            <span>
              + delivery: check at store
            </span>
          </div>
        )}

        <div className="price small">
          {p.originalPrice && (
            <s>
              {money(p.originalPrice)}
            </s>
          )}

          {p.discount > 0 && (
            <mark>
              {p.discount}% OFF
            </mark>
          )}
        </div>

        <div className="badges">
          {below >= 50 && (
            <span className="badge pink">
              {money(below)} below average
            </span>
          )}

          {p.lowestSeen && (
            <span className="badge blue">
              lowest we've seen
            </span>
          )}

          {p.droppedBy > 0 && (
            <span className="badge green">
              dropped {money(p.droppedBy)}
            </span>
          )}
        </div>
        {match?.saving > 0 && <small className="saving">₹{match.saving.toLocaleString('en-IN')} cheaper than {match.hideTag ? 'your item' : 'your link'}</small>}
        {fit?.ticks?.length > 0 && <ul className="fortick">{fit.ticks.map((t) => <li key={t}>✓ {t}</li>)}</ul>}
        <small className="sizeline">{mySize ? <>your size: <b>{mySize}</b> · select it at the store</> : <>set your {kind} size in filters for reminders</>}</small>
        {fetchedAt && <small className="checked">checked {ago(fetchedAt)}</small>}
        {p.secondHand && <small className="tagline2">pre-owned</small>}
        {p.url
          ? <StoreButton p={p} />
          : <span className="btn block blue">link unavailable</span>}
        <StoresButton p={p} mySize={mySize} kind={kind} />
        <CompareButton product={{ ...p, url: storeHref(p) || p.url }} />
        {p.id && <Link className="btn block blue" to={`/history/${encodeURIComponent(p.id)}`}>price history ★</Link>}
      </div>
    </Window>
  );
}
function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { token } = useAuth();
  const passport = usePassport()?.passport || null;
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    if (!token) { setRecent([]); return; }
    getHistoryRequest(token).then((h) => setRecent((h || []).filter((x) => x.kind === 'text').slice(0, 6))).catch(() => setRecent([]));
  }, [token]);
  const urlQ = params.get('q') || '';
  const linkParam = params.get('link') || '';
  const [input, setInput] = useState(urlQ || linkParam);
  const [link, setLink] = useState(null);         // { loading, error, query, source }
  const [linkQuery, setLinkQuery] = useState('');
  const [onlySame, setOnlySame] = useState(false);
  const [photo, setPhoto] = useState(null);       // { preview, source } when a photo search is on screen
  const photoRef = useRef(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [mySizes, saveSizes] = useSizes();
  const [manualPrice, setManualPrice] = useState('');
  const fileRef = useRef(null);
  const source = useMemo(() => (urlQ ? readLinkSource(urlQ) : null), [urlQ]);

  // A pasted link: read it (free), then ask the user to confirm the search words.
  useEffect(() => {
    if (!linkParam) { setLink(null); return undefined; }
    photoRef.current = false; setPhoto(null); setLive(null);
    setInput(linkParam);
    let dead = false;
    setLink({ loading: true });
    readLinkRequest(linkParam)
      .then((d) => { if (dead) return; setLink(d); setLinkQuery(d.query); setManualPrice(''); })
      .catch((e) => { if (!dead) setLink({ error: e.message }); });
    return () => { dead = true; };
  }, [linkParam]);

  const scoutLink = (e) => {
    e?.preventDefault();
    const q = linkQuery.trim();
    if (!q) return;
    const typed = Number(String(manualPrice).replace(/[^\d.]/g, ''));
    const src = !link.source.price && typed > 0 ? { ...link.source, price: Math.round(typed), priceTyped: true } : link.source;
    sessionStorage.setItem(LINK_KEY, JSON.stringify({ query: normQ(q), source: src }));
    setParams({ q });
  };
  const [live, setLive] = useState(null);      // { results, cached, fetchedAt }
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');    // shown when we fall back to demo data
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refreshPrices = async () => {
    setRefreshing(true);
    try { setLive(await searchRequest(urlQ, { refresh: true })); toast('prices refreshed ✦'); }
    catch (e) { toast(e.message); }
    finally { setRefreshing(false); }
  };

  // Photo search: an uploaded photo, or a link to a photo. Uses 1 live search.
  const runPhoto = async ({ file, url, source }) => {
    photoRef.current = true;
    setParams({}); setLink(null);
    setPhoto({ preview: file ? URL.createObjectURL(file) : url, source: source || null });
    setLive(null); setError(''); setNotice(''); setStore('all'); setLiveCap(null); setKnownDelivery(false); setOnlySame(false);
    setLoading(true);
    try {
      const blob = file ? await shrinkImage(file) : null;
      const d = await imageSearchRequest({ blob, url });
      setLive(d);
      recordSearch(token, { query: source?.title ? `photo of ${source.title}`.slice(0, 120) : 'photo search', kind: 'photo', results: d.results.length });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose a photo (JPG, PNG or WebP).'); return; }
    runPhoto({ file });
  };

  // demo-catalogue filters (used when there's no live search)
  const maxP = useMemo(() => Math.max(...demoProducts.map((p) => p.price)), []);
  const [aud, setAud] = useState(params.get('aud') || 'all');
  const [platform, setPlatform] = useState('all');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [cap, setCap] = useState(maxP);
  // live filters
  const [store, setStore] = useState('all');
  const [liveCap, setLiveCap] = useState(null);
  const [knownDelivery, setKnownDelivery] = useState(false);
  const [brand, setBrand] = useState('all');
  const [condition, setCondition] = useState('all');   // all | new | pre-owned
  const [minDisc, setMinDisc] = useState(0);
  const [sort, setSort] = useState('deal');

  // Run a live search whenever the ?q= in the address changes.
  useEffect(() => {
    if (photoRef.current && !urlQ.trim()) return undefined; // a photo search is on screen
    photoRef.current = false; setPhoto(null);
    if (!linkParam) setInput(urlQ);
    setOnlySame(false);
    setAud(params.get('aud') || 'all');
    setStore('all'); setLiveCap(null); setKnownDelivery(false);
    if (!urlQ.trim()) { setLive(null); setNotice(''); setError(''); setLoading(false); return undefined; }
    let dead = false;
    setLoading(true); setError(''); setNotice('');
    searchRequest(urlQ)
      .then((d) => {
        if (dead) return;
        setLive(d);
        let fromLink = null;
        try { const s = JSON.parse(sessionStorage.getItem(LINK_KEY) || 'null'); if (s?.query === normQ(urlQ)) fromLink = s.source?.url; } catch { /* ignore */ }
        recordSearch(token, fromLink ? { query: urlQ, kind: 'link', link: fromLink, results: d.results.length } : { query: urlQ, kind: 'text', results: d.results.length });
      })
      .catch((e) => {
        if (dead) return;
        setLive(null);
        if (['NO_KEY', 'QUOTA', 'NETWORK', 'API'].includes(e.code)) setNotice(`live search is unavailable right now (${e.message}) — showing demo catalogue instead.`);
        else setError(e.message);
      })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [urlQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (looksLikeImageUrl(q)) { runPhoto({ url: q }); return; }
    photoRef.current = false; setPhoto(null); setLive(null);
    if (looksLikeUrl(q)) setParams({ link: q });
    else setParams(q ? { q } : {});
  };

  const toggle = (key, v) => {
    const [arr, set] = key === 'sizes' ? [sizes, setSizes] : [colors, setColors];
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  const resetDemo = () => { setAud('all'); setPlatform('all'); setSizes([]); setColors([]); setCap(maxP); };

  const liveMode = Boolean(live);
  const liveMax = liveMode && live.results.length ? Math.ceil(Math.max(...live.results.map((p) => p.price)) / 50) * 50 : 0;
  const liveStores = liveMode ? ['all', ...new Set(live.results.map((p) => p.store))] : [];
  const liveBrands = useMemo(() => {
    if (!liveMode) return [];
    const n = {};
    live.results.forEach((p) => { const b = brandOf(p.title); if (b) n[b] = (n[b] || 0) + 1; });
    return Object.entries(n).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([b]) => b);
  }, [live, liveMode]);
  const hasPreOwned = liveMode && live.results.some((p) => p.secondHand);

  const liveAvg = useMemo(() => {
    if (!liveMode || !live.results.length) return 0;
    const v = live.results.map((p) => p.finalPrice ?? p.price).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  }, [live, liveMode]);

  const liveShown = useMemo(() => {
    if (!liveMode) return [];
    const capV = liveCap ?? liveMax;
    const eff = (p) => p.finalPrice ?? p.price;
    return live.results
      .filter((p) => (store === 'all' || p.store === store) && p.price <= capV && (!knownDelivery || p.delivery !== null) && (!onlySame || matchInfo(p, source, live.query)?.same)
        && (brand === 'all' || brandOf(p.title) === brand) && (condition === 'all' || (condition === 'pre-owned') === Boolean(p.secondHand)) && (p.discount || 0) >= minDisc)
      .sort((a, b) => (sort === 'final' ? eff(a) - eff(b) : sort === 'price' ? a.price - b.price : sort === 'discount' ? (b.discount || 0) - (a.discount || 0)
        : sort === 'foryou' ? (fitFor(b, passport).score - fitFor(a, passport).score) || (b.dealScore - a.dealScore)
        : b.dealScore - a.dealScore));
  }, [live, liveMode, store, liveCap, liveMax, knownDelivery, sort, onlySame, source, passport, brand, condition, minDisc]);

  const demoShown = useMemo(() => {
    const words = (notice ? urlQ : '').toLowerCase().split(/\s+/).filter(Boolean);
    return demoProducts
      .filter((p) => {
        const hay = `${p.name} ${p.category} ${p.brand} ${p.platform} ${p.colors.join(' ')}`.toLowerCase();
        return (aud === 'all' || p.audience === aud)
          && (platform === 'all' || p.platform === platform)
          && words.every((w) => hay.includes(w))
          && (!sizes.length || p.sizes.some((s) => sizes.includes(s)))
          && (!colors.length || p.colors.some((c) => colors.includes(colorKey(c))))
          && p.price <= cap;
      })
      .sort((a, b) => (sort === 'price' ? a.price - b.price : score(b) - score(a)));
  }, [notice, urlQ, aud, platform, sizes, colors, cap, sort]);

  const count = liveMode ? liveShown.length : demoShown.length;
  const checked = liveMode ? new Date(live.fetchedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <Page>
      <div className="searchlayout">
        {liveMode ? (
          <Window title="✦ FILTERS.exe" tone="pink" className="filters" icon="⚙">
            <b>stores</b>
            <div className="chips">{liveStores.map((x) => (
              <button type="button" key={x} className={`chip${store === x ? ' on' : ''}`} aria-pressed={store === x} onClick={() => setStore(x)}>{x}</button>
            ))}</div>
            <b>max price <em>{money(liveCap ?? liveMax)}</em></b>
            <input type="range" min="0" max={liveMax} step="50" value={liveCap ?? liveMax} onChange={(e) => setLiveCap(Number(e.target.value))} />
            {liveBrands.length > 1 && (
              <>
                <b>brand</b>
                <div className="chips">{['all', ...liveBrands].map((x) => (
                  <button type="button" key={x} className={`chip${brand === x ? ' on' : ''}`} aria-pressed={brand === x} onClick={() => setBrand(x)}>{x}</button>
                ))}</div>
              </>
            )}
            <b>minimum discount</b>
            <div className="chips">{[0, 10, 20, 30, 50].map((x) => (
              <button type="button" key={x} className={`chip${minDisc === x ? ' on' : ''}`} aria-pressed={minDisc === x} onClick={() => setMinDisc(x)}>{x ? `${x}%+` : 'any'}</button>
            ))}</div>
            {hasPreOwned && (
              <>
                <b>condition</b>
                <div className="chips">{[['all', 'all'], ['new', 'new'], ['pre-owned', 'pre-owned']].map(([v, t]) => (
                  <button type="button" key={v} className={`chip${condition === v ? ' on' : ''}`} aria-pressed={condition === v} onClick={() => setCondition(v)}>{t}</button>
                ))}</div>
              </>
            )}
            <label className="check2"><input type="checkbox" checked={knownDelivery} onChange={(e) => setKnownDelivery(e.target.checked)} /> only show known delivery cost</label>
            {source && <label className="check2"><input type="checkbox" checked={onlySame} onChange={(e) => setOnlySame(e.target.checked)} /> only “likely same item”</label>}
            <SizePicker sizes={mySizes} onSave={saveSizes} />
            <button className="btn block" onClick={() => { setStore('all'); setLiveCap(null); setKnownDelivery(false); setBrand('all'); setCondition('all'); setMinDisc(0); }}>reset</button>
          </Window>
        ) : (
          <Filters f={{ aud, setAud, platform, setPlatform, sizes, colors, toggle, cap, setCap, maxP, reset: resetDemo }} />
        )}
        <div>
          <Window bar={false} className="resulthead">
            <div className="rh">
              <div>
                <h2>{urlQ ? `results for “${urlQ}”` : photo ? 'look-alikes for your photo' : linkParam ? 'scouting your link' : 'featured picks'}</h2>
                <small>
                  {linkParam && !urlQ ? 'check the search words, then scout' : loading ? 'scouting stores…' : `${count} ${liveMode ? 'live offers' : 'demo products'}`}
                  {liveMode && !loading && ` · checked ${checked}${live.cached ? ' (saved, free)' : ''}`}
                  {liveMode && !loading && live.usedToday != null && ` · ${live.usedToday} live searches today`}
                  {liveMode && !loading && live.canRefresh && urlQ && <button type="button" className="btn tiny blue refreshbtn" disabled={refreshing} onClick={refreshPrices}>{refreshing ? 'refreshing…' : 'refresh prices (1 search)'}</button>}
                </small>
              </div>
              <form className="searchmini" onSubmit={submit}>
                <Search size={15} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="search, paste a product link or photo link" aria-label="search, paste a product link or photo link" />
                <button className="btn tiny blue" type="button" title="search with a photo" aria-label="search with a photo" onClick={() => fileRef.current?.click()}><Camera size={14} /></button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                <button className="btn tiny" type="submit">scout</button>
              </form>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort">
                <option value="deal">best deal</option>
                {liveMode && passport && <option value="foryou">for you ♡</option>}
                {liveMode && <option value="final">lowest final price</option>}
                {liveMode && <option value="discount">largest discount</option>}
                <option value="price">lowest item price</option>
              </select>
            </div>
          </Window>

          {linkParam && !urlQ && link && (
            <Window title="link.exe" tone="pink" icon="🔗" className="linkwin">
              {link.loading ? <p className="lg-msg">reading your link…</p> : link.error ? (
                <div className="linkerr"><p className="lg-msg">{link.error}</p><button className="btn blue" onClick={() => setParams({})}>ok</button></div>
              ) : (
                <form className="linkgrid" onSubmit={scoutLink}>
                  {link.source.image ? <img src={link.source.image} alt="" /> : <div className="noimg small">no image</div>}
                  <div className="linkinfo">
                    <small>your item from <b>{link.source.store}</b>{link.source.readFrom === 'link' && ' (read from the link)'}</small>
                    <b className="ptitle">{link.source.title}</b>
                    {link.source.price ? <span>{money(link.source.price)}</span> : (
                      <label className="lg-field"><span>this store hides its price. type the price you see (optional)</span>
                        <input inputMode="numeric" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="e.g. 1299" aria-label="price on the store page" />
                      </label>
                    )}
                    <label className="lg-field"><span>we&apos;ll search for</span>
                      <input value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} aria-label="search words" />
                    </label>
                    <div className="row"><button className="btn" type="submit">scout this →</button><button type="button" className="btn blue" onClick={() => setParams({})}>cancel</button></div>
                    {link.source.image && <button type="button" className="btn tiny blue photobtn" onClick={() => runPhoto({ url: link.source.image, source: link.source })}>📷 find look-alikes from its photo instead</button>}
                    <small>uses 1 live search. edit the words if they look off.</small>
                  </div>
                </form>
              )}
            </Window>
          )}

          {source && liveMode && !loading && (() => {
            const best = live.results.reduce((m, p) => Math.min(m, p.finalPrice ?? p.price), Infinity);
            const bestP = live.results.find((p) => (p.finalPrice ?? p.price) === best);
            return (
              <div className="yourItem">
                {source.image && <img src={source.image} alt="" />}
                <div>
                  <small>your link · {source.store}</small>
                  <b>{source.title}</b>
                  <span>{source.price ? <>{money(source.price)}{source.priceTyped && ' (you typed)'}</> : 'price not readable'}</span>
                </div>
                <div className="verdict">{!source.price ? 'compare the offers below ↓'
                  : best < source.price ? <>best offer is <b>{money(source.price - best)} cheaper</b> at {bestP?.store}</>
                  : 'the store you pasted is already the cheapest we found ♡'}</div>
              </div>
            );
          })()}

          {photo && liveMode && !loading && (() => {
            const eff = (p) => p.finalPrice ?? p.price;
            const best = live.results.length ? live.results.reduce((m, p) => (eff(p) < eff(m) ? p : m)) : null;
            const sp = photo.source?.price;
            return (
              <div className="yourItem">
                <img src={photo.preview} alt="" />
                <div>
                  <small>{photo.source ? `your link · ${photo.source.store}` : 'your photo'}</small>
                  <b>{photo.source?.title || 'visual matches from Google Lens'}</b>
                  {sp ? <span>{money(sp)}</span> : null}
                </div>
                <div className="verdict">{!best ? 'no priced look-alikes found'
                  : sp && eff(best) < sp ? <>best look-alike is <b>{money(sp - eff(best))} cheaper</b> at {best.store}</>
                  : 'look-alikes sorted by best deal ↓'}</div>
              </div>
            );
          })()}

          {notice && <div className="banner">{notice}</div>}
          {error && <div className="banner err">{error}</div>}
          {!urlQ && !linkParam && !photo && (
            <>
              <div className="banner soft">these are demo products. search above to compare live prices across stores ♡</div>
              {recent.length > 0 && (
                <div className="recentbar">
                  <b>your recent searches</b>
                  {recent.map((h) => <button key={h.id} type="button" className="chip" onClick={() => setParams({ q: h.query })}>⌕ {h.query}</button>)}
                  <Link className="uline" to="/passport?tab=history">see all</Link>
                </div>
              )}
              {token && !passport?.budget && !passport?.styles?.length && (
                <div className="banner">✦ fill in your <Link className="uline" to="/passport">style passport</Link> and we&apos;ll tick offers that fit your budget, style and favourite stores.</div>
              )}
              <Window title="photo.exe" tone="pink" icon="📷" className="photowin">
                <div className="photodrop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}>
                  <p><b>search by photo</b><br />drop a picture of an outfit here, or choose one. we find look-alikes and compare prices (uses 1 live search).</p>
                  <button type="button" className="btn" onClick={() => fileRef.current?.click()}>choose a photo</button>
                  <form className="photolink" onSubmit={(e) => { e.preventDefault(); const u = photoUrl.trim(); if (/^https?:\/\/\S+$/i.test(u)) runPhoto({ url: u }); else setError('Paste a full photo link starting with https://'); }}>
                    <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="or paste a link to a photo (https://…)" aria-label="link to a photo" />
                    <button className="btn blue" type="submit">find look-alikes</button>
                  </form>
                  <small>tip: a clear photo with the item in the middle works best. on a store page, right-click the picture and choose “copy image address”.</small>
                </div>
              </Window>
            </>
          )}

          {linkParam && !urlQ ? null : loading ? (
            <div className="products">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" />)}</div>
          ) : liveMode ? (
            (() => {
              const card = (p) => <LiveCard key={p.id} p={p} fit={fitFor(p, passport)} avg={liveAvg} sizes={mySizes} fetchedAt={live.fetchedAt} query={live.query} match={photo ? photoMatch(p, photo.source) : matchInfo(p, source, live.query)} />;
              if (!source || photo) return <div className="products">{liveShown.map(card)}</div>;
              const exact = liveShown.filter((p) => matchInfo(p, source, live.query)?.same);
              const similar = liveShown.filter((p) => !matchInfo(p, source, live.query)?.same);
              return (
                <>
                  <h3 className="sectionhead">exact matches <small>{exact.length ? `${exact.length} · same brand and product words as your link` : 'none found. the closest alternatives are below'}</small></h3>
                  {exact.length > 0 && <div className="products">{exact.map(card)}</div>}
                  {similar.length > 0 && !onlySame && (
                    <>
                      <h3 className="sectionhead">similar alternatives <small>{similar.length} · similar items at other prices</small></h3>
                      <div className="products">{similar.map(card)}</div>
                    </>
                  )}
                </>
              );
            })()
          ) : photo ? null : (
            <div className="products">{demoShown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}

          {!loading && count === 0 && !(linkParam && !urlQ) && (
            <div className="popwrap">
              <Window title="error.exe" tone="pink" popup icon="!" onClose={() => setParams({})}>
                <div className="notfound">ITEM NOT FOUND :(<small>{photo ? 'no priced look-alikes found. try a clearer photo with the item in the middle.' : 'try a simpler search, like “white sneakers” or “denim jacket”.'}</small>
                  <button className="btn blue" onClick={() => setParams({})}>clear search</button></div>
              </Window>
            </div>
          )}
          {liveMode && !loading && count > 0 && (
            <p className="disclaimer">prices come from Google Shopping listings for India and can change at the store. “you pay” = item + delivery where the store lists it. coupons and card offers aren&apos;t included. “lowest we&apos;ve seen” compares with earlier StyleScout searches.</p>
          )}
        </div>
      </div>
    </Page>
  );
}

/* ---------- product, compare, wishlist ---------- */
function ProductDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const p = demoProducts.find((x) => String(x.id) === id) || demoProducts[0];
  const variants = demoProducts.filter((x) => x.category === p.category).slice(0, 5);
  return (
    <Page>
      <Window title={`${p.name}.jpg`} className="detail" icon="◐">
        <div className="thumbs">{[p, p, p].map((x, i) => <img key={i} src={x.image} alt="" />)}</div>
        <img className="detailimg" src={p.image} alt={p.name} />
        <div className="detailcopy">
          <h2>{p.name} <span className="pinkheart">♥</span></h2>
          <p>★ {p.rating} ({p.reviews.toLocaleString()} reviews)</p>
          <div className="price"><strong>{money(p.price)}</strong><s>{money(p.originalPrice)}</s><mark>{p.discount}% OFF</mark></div>
          <p className="lbl">available at:</p>
          {variants.map((v) => <a className="storeRow" key={v.id} href={v.url} target="_blank" rel="noreferrer"><b>{v.platform}</b><span>{money(v.price)} ↗</span></a>)}
          <p className="lbl">size:</p>
          <div className="sizes">{p.sizes.map((s) => <span key={s}>{s}</span>)}</div>
          <div className="row">
            <button className="btn" onClick={() => { addId('compare', p.id, 4); nav('/compare'); }}>compare prices ↔</button>
            <button className="btn blue" onClick={() => { addId('wishlist', p.id); toast('saved to wishlist ♡'); }}>♥ save</button>
          </div>
        </div>
      </Window>
    </Page>
  );
}

function Compare() {
  const ids = getIds('compare');
  let ps = demoProducts.filter((p) => ids.includes(p.id));
  if (!ps.length) ps = demoProducts.slice(0, 5);
  const ranked = [...ps].sort((a, b) => score(b) - score(a));
  return (
    <Page>
      <Window title="compare prices" className="compare" icon="↔">
        <div className="compareHero"><img src={ps[0].image} alt={ps[0].name} /><b>{ps[0].name}</b></div>
        <div>
          <table>
            <thead><tr><th>store</th><th>price</th><th>rating</th><th /></tr></thead>
            <tbody>{ps.map((p) => <tr key={p.id}><td><b>{p.platform}</b></td><td>{money(p.price)}</td><td>★ {p.rating}</td><td><a className="btn tiny" href={p.url} target="_blank" rel="noreferrer">view ↗</a></td></tr>)}</tbody>
          </table>
          <div className="bestbar">☺ best deal: {ranked[0].platform} at {money(ranked[0].price)}</div>
        </div>
      </Window>
    </Page>
  );
}

function Wishlist() {
  const nav = useNavigate();
  const [ids, setIds] = useState(() => getIds('wishlist'));
  const ps = demoProducts.filter((p) => ids.includes(p.id));
  const remove = (id) => { const next = ids.filter((x) => x !== id); localStorage.setItem('wishlist', JSON.stringify(next)); setIds(next); };
  return (
    <Page>
      <Window title="my wishlist ♡" tone="pink" icon="♥">
        {ps.length ? (
          <div className="wishlist">
            {ps.map((p) => (
              <div className="wish" key={p.id}>
                <img src={p.image} alt={p.name} />
                <b>{p.name}</b><span>{money(p.price)} &nbsp; ★ {p.rating}</span>
                <div className="row">
                  <button className="btn tiny" onClick={() => nav(`/product/${p.id}`)}>view ↗</button>
                  <button className="btn blue tiny" aria-label="remove" onClick={() => remove(p.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty"><span className="bigheart">♡</span><p>nothing saved yet. tap the heart on any item to keep it here.</p><button className="btn" onClick={() => nav('/search')}>start scouting →</button></div>
        )}
      </Window>
    </Page>
  );
}

/* ---------- alerts, profile, admin ---------- */
function Alerts() {
  const [target, setTarget] = useState('1000');
  const [on, setOn] = useState(true);
  return (
    <Page>
      <Window title="price alerts ♫" tone="pink" className="alerts" icon="♫">
        <div className="alertphone"><Phone /></div>
        <div className="alertform">
          <h2>get notified when the price drops!</h2>
          <label>product<select><option>Off-Shoulder Top</option><option>Denim Jacket</option></select></label>
          <label>current price<input value="₹1,499" readOnly /></label>
          <label>notify me at<input value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label className="check">email notification <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /></label>
          <button className="btn block" onClick={() => toast('price alert saved (demo) ♫')}>set alert ♫</button>
        </div>
      </Window>
    </Page>
  );
}

function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const menu = ['Profile', 'My Wishlist', 'Price Alerts', 'Search History', 'My Reviews', 'Logout'];
  const act = (x) => {
    if (x === 'Logout') { logout(); nav('/login'); }
    else if (x === 'My Wishlist') nav('/wishlist');
    else if (x === 'Price Alerts') nav('/alerts');
  };
  return (
    <Page>
      <div className="profilegrid">
        <Window title="my account" className="sideMenu" icon="☺">
          {menu.map((x) => <button key={x} onClick={() => act(x)}>{x}</button>)}
        </Window>
        <Window title="profile" tone="pink" className="profile" icon="☺">
          <div className="avatar">😎</div>
          <h2>{user ? user.name : 'Guest'}</h2>
          <p>{user ? user.email : <Link className="uline" to="/login">log in to your account</Link>}</p>
          <h3>style stats</h3>
          <div className="stats">
            <div>♥<b>{getIds('wishlist').length}</b><small>wishlisted</small></div>
            <div>↔<b>{getIds('compare').length}</b><small>comparisons</small></div>
            <div>🔔<b>0</b><small>active alerts</small></div>
          </div>
        </Window>
      </div>
    </Page>
  );
}

function Admin() {
  const menu = ['Dashboard', 'Products', 'Users', 'Reviews', 'Price Sources', 'Alerts', 'Settings'];
  return (
    <Page>
      <div className="profilegrid">
        <Window title="admin panel" className="sideMenu" icon="⚙">{menu.map((x) => <button key={x}>{x}</button>)}</Window>
        <Window title="overview" className="admin" icon="▣">
          <div className="adminstats">
            <div>🛒<b>248</b><small>products</small></div>
            <div>👤<b>132</b><small>users</small></div>
            <div>◉<b>1.8K</b><small>comparisons</small></div>
            <div>🔔<b>47</b><small>active alerts</small></div>
          </div>
          <h3>recent products <button className="btn tiny"><Plus size={14} /> add product</button></h3>
          <table>
            <tbody>{demoProducts.slice(0, 4).map((p) => <tr key={p.id}><td>{p.name}</td><td>{money(p.price)}</td><td>{p.platform}</td><td><span className="active">active</span></td></tr>)}</tbody>
          </table>
        </Window>
      </div>
    </Page>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/compare" element={<WithNav><ComparePage /></WithNav>} />
        <Route path="/history/:productKey" element={<WithNav><ProductHistory /></WithNav>} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Passport />} />
        <Route path="/passport" element={<Passport />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <ToastHost />
    </>
  );
}
