import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2, Plus, Search, ChevronRight, Truck, Tag, Globe } from 'lucide-react';
import { demoProducts, score } from './data';
import Login from './pages/Login';
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

function SearchPage() {
  const [params] = useSearchParams();
  const maxP = useMemo(() => Math.max(...demoProducts.map((p) => p.price)), []);
  const [q, setQ] = useState(params.get('q') || '');
  const [aud, setAud] = useState(params.get('aud') || 'all');
  const [platform, setPlatform] = useState('all');
  const [sort, setSort] = useState('deal');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [cap, setCap] = useState(maxP);

  useEffect(() => { setQ(params.get('q') || ''); setAud(params.get('aud') || 'all'); }, [params]);

  const toggle = (key, v) => {
    const [arr, set] = key === 'sizes' ? [sizes, setSizes] : [colors, setColors];
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  const reset = () => { setAud('all'); setPlatform('all'); setSizes([]); setColors([]); setCap(maxP); setQ(''); };

  const ps = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
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
  }, [q, aud, platform, sort, sizes, colors, cap]);

  return (
    <Page>
      <div className="searchlayout">
        <Filters f={{ aud, setAud, platform, setPlatform, sizes, colors, toggle, cap, setCap, maxP, reset }} />
        <div>
          <Window bar={false} className="resulthead">
            <div className="rh">
              <div><h2>results for “{q || 'everything'}”</h2><small>{ps.length} matching products</small></div>
              <div className="searchmini"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="try: denim, tee, jacket" aria-label="search products" /></div>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort">
                <option value="deal">best deal</option>
                <option value="price">price low → high</option>
              </select>
            </div>
          </Window>
          <div className="products">{ps.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          {!ps.length && (
            <div className="popwrap">
              <Window title="error.exe" tone="pink" popup icon="!" onClose={reset}>
                <div className="notfound">ITEM NOT FOUND :(<small>StyleScout only accepts clothing searches/images.</small>
                  <button className="btn blue" onClick={reset}>clear filters</button></div>
              </Window>
            </div>
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
