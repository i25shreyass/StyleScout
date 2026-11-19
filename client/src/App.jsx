import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2, Plus, Search, ChevronRight, Truck, Tag, Globe } from 'lucide-react';
import { demoProducts, score } from './data';
import Login from './pages/Login';
import { searchRequest, readLinkRequest, looksLikeUrl } from './services/api';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './context/AuthContext';
import { Window, TopNav, ToastHost, toast, Phone, Disc, Sparkle, Ticker, Footer } from './components/Ui';

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

function LiveCard({ p, match }) {
  const delivery = p.delivery === null ? null : p.delivery === 0 ? 'free delivery' : `+ ${money(p.delivery)} delivery`;
  return (
    <Window title={`${p.store.toLowerCase().replace(/\s+/g, '')}.jpg`} className="product" icon="◐">
      <a className="productpic" href={p.url || '#'} target="_blank" rel="noreferrer">
        {p.image ? <img src={p.image} alt={p.title} loading="lazy" /> : <div className="noimg">no image</div>}
        {p.belowTypical >= 15 && <span className="burst">GOOD<br />DEAL</span>}
        {match && <span className={`matchtag${match.same ? ' same' : ''}`}>{match.same ? 'likely same item' : 'similar'}</span>}
      </a>
      <div className="pbody">
        <b className="ptitle" title={p.title}>{p.title}</b>
        <div className="storeline"><strong>{p.store}</strong>{p.rating && <span>★ {p.rating}{p.reviews ? ` (${p.reviews})` : ''}</span>}</div>
        <div className="price">
          <strong>{money(p.price)}</strong>
          {p.originalPrice && <s>{money(p.originalPrice)}</s>}
          {p.discount > 0 && <mark>{p.discount}% OFF</mark>}
        </div>
        {delivery ? (
          <div className="finalline"><span>{delivery}</span><b>final {money(p.finalPrice)}</b></div>
        ) : (
          <div className="finalline unknown" title="This store didn't share a delivery fee. The total may be higher at checkout.">delivery: check at store</div>
        )}
        {match?.saving > 0 && <small className="saving">₹{match.saving.toLocaleString('en-IN')} cheaper than your link</small>}
        {p.belowTypical > 0 && <small>{p.belowTypical}% below the typical price here</small>}
        {p.secondHand && <small className="tagline2">pre-owned</small>}
        {p.url
          ? <a className="btn block" href={p.url} target="_blank" rel="noreferrer">view at store ↗</a>
          : <span className="btn block blue">link unavailable</span>}
      </div>
    </Window>
  );
}

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') || '';
  const linkParam = params.get('link') || '';
  const [input, setInput] = useState(urlQ || linkParam);
  const [link, setLink] = useState(null);         // { loading, error, query, source }
  const [linkQuery, setLinkQuery] = useState('');
  const [onlySame, setOnlySame] = useState(false);
  const source = useMemo(() => (urlQ ? readLinkSource(urlQ) : null), [urlQ]);

  // A pasted link: read it (free), then ask the user to confirm the search words.
  useEffect(() => {
    if (!linkParam) { setLink(null); return undefined; }
    setInput(linkParam);
    let dead = false;
    setLink({ loading: true });
    readLinkRequest(linkParam)
      .then((d) => { if (dead) return; setLink(d); setLinkQuery(d.query); })
      .catch((e) => { if (!dead) setLink({ error: e.message }); });
    return () => { dead = true; };
  }, [linkParam]);

  const scoutLink = (e) => {
    e?.preventDefault();
    const q = linkQuery.trim();
    if (!q) return;
    sessionStorage.setItem(LINK_KEY, JSON.stringify({ query: normQ(q), source: link.source }));
    setParams({ q });
  };
  const [live, setLive] = useState(null);      // { results, cached, fetchedAt }
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');    // shown when we fall back to demo data
  const [error, setError] = useState('');

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
  const [sort, setSort] = useState('deal');

  // Run a live search whenever the ?q= in the address changes.
  useEffect(() => {
    if (!linkParam) setInput(urlQ);
    setOnlySame(false);
    setAud(params.get('aud') || 'all');
    setStore('all'); setLiveCap(null); setKnownDelivery(false);
    if (!urlQ.trim()) { setLive(null); setNotice(''); setError(''); setLoading(false); return undefined; }
    let dead = false;
    setLoading(true); setError(''); setNotice('');
    searchRequest(urlQ)
      .then((d) => { if (!dead) setLive(d); })
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

  const liveShown = useMemo(() => {
    if (!liveMode) return [];
    const capV = liveCap ?? liveMax;
    const eff = (p) => p.finalPrice ?? p.price;
    return live.results
      .filter((p) => (store === 'all' || p.store === store) && p.price <= capV && (!knownDelivery || p.delivery !== null) && (!onlySame || matchInfo(p, source, live.query)?.same))
      .sort((a, b) => (sort === 'final' ? eff(a) - eff(b) : sort === 'price' ? a.price - b.price : b.dealScore - a.dealScore));
  }, [live, liveMode, store, liveCap, liveMax, knownDelivery, sort, onlySame, source]);

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
            <label className="check2"><input type="checkbox" checked={knownDelivery} onChange={(e) => setKnownDelivery(e.target.checked)} /> only show known delivery cost</label>
            {source && <label className="check2"><input type="checkbox" checked={onlySame} onChange={(e) => setOnlySame(e.target.checked)} /> only “likely same item”</label>}
            <p className="filternote">size &amp; colour matching for live results is coming next. pick your size on the store page.</p>
            <button className="btn block" onClick={() => { setStore('all'); setLiveCap(null); setKnownDelivery(false); }}>reset</button>
          </Window>
        ) : (
          <Filters f={{ aud, setAud, platform, setPlatform, sizes, colors, toggle, cap, setCap, maxP, reset: resetDemo }} />
        )}
        <div>
          <Window bar={false} className="resulthead">
            <div className="rh">
              <div>
                <h2>{urlQ ? `results for “${urlQ}”` : linkParam ? 'scouting your link' : 'featured picks'}</h2>
                <small>
                  {linkParam && !urlQ ? 'check the search words, then scout' : loading ? 'scouting stores…' : `${count} ${liveMode ? 'live offers' : 'demo products'}`}
                  {liveMode && !loading && ` · checked ${checked}${live.cached ? ' (saved)' : ''}`}
                </small>
              </div>
              <form className="searchmini" onSubmit={submit}>
                <Search size={15} />
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="search or paste a product link" aria-label="search or paste a product link" />
                <button className="btn tiny" type="submit">scout</button>
              </form>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort">
                <option value="deal">best deal</option>
                {liveMode && <option value="final">lowest final price</option>}
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
                    <span>{link.source.price ? money(link.source.price) : 'price not readable from this store'}</span>
                    <label className="lg-field"><span>we&apos;ll search for</span>
                      <input value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} aria-label="search words" />
                    </label>
                    <div className="row"><button className="btn" type="submit">scout this →</button><button type="button" className="btn blue" onClick={() => setParams({})}>cancel</button></div>
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
                  <span>{source.price ? money(source.price) : 'price not readable'}</span>
                </div>
                <div className="verdict">{!source.price ? 'compare the offers below ↓'
                  : best < source.price ? <>best offer is <b>{money(source.price - best)} cheaper</b> at {bestP?.store}</>
                  : 'the store you pasted is already the cheapest we found ♡'}</div>
              </div>
            );
          })()}

          {notice && <div className="banner">{notice}</div>}
          {error && <div className="banner err">{error}</div>}
          {!urlQ && !linkParam && <div className="banner soft">these are demo products. search above to compare live prices across stores ♡</div>}

          {linkParam && !urlQ ? null : loading ? (
            <div className="products">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" />)}</div>
          ) : liveMode ? (
            <div className="products">{liveShown.map((p) => <LiveCard key={p.id} p={p} match={matchInfo(p, source, live.query)} />)}</div>
          ) : (
            <div className="products">{demoShown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}

          {!loading && count === 0 && !(linkParam && !urlQ) && (
            <div className="popwrap">
              <Window title="error.exe" tone="pink" popup icon="!" onClose={() => setParams({})}>
                <div className="notfound">ITEM NOT FOUND :(<small>try a simpler search, like “white sneakers” or “denim jacket”.</small>
                  <button className="btn blue" onClick={() => setParams({})}>clear search</button></div>
              </Window>
            </div>
          )}
          {liveMode && !loading && count > 0 && (
            <p className="disclaimer">prices come from Google Shopping listings for India and can change at the store. “final” = item + delivery where the store lists it; coupons and card offers aren&apos;t included yet.</p>
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
        <Route path="/compare" element={<Compare />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <ToastHost />
    </>
  );
}
