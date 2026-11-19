import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deleteWishlistItemRequest, getWishlistRequest, subscribeWishlist } from '../services/api';
import { Window, TopNav, Ticker, Footer, toast } from '../components/Ui';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function Wishlist() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) { setItems([]); setLoading(false); setError(''); return undefined; }
    setLoading(true);
    setError('');
    getWishlistRequest(token).then((data) => { if (active) { setItems(data); setLoading(false); } })
      .catch((e) => { if (active) { setError(e.message || 'could not load your wishlist'); setLoading(false); } });
    const unsubscribe = subscribeWishlist(() => {
      getWishlistRequest(token).then((data) => { if (active) setItems(data); }).catch(() => {});
    });
    return () => { active = false; unsubscribe(); };
  }, [token]);

  const remove = async (item) => {
    setRemoving(item.productKey);
    try {
      await deleteWishlistItemRequest(token, item.productKey);
      setItems((current) => current.filter((x) => x.productKey !== item.productKey));
    } catch (e) { toast(e.message || 'could not remove this item'); }
    finally { setRemoving(''); }
  };

  return <>
    <TopNav />
    <main className="page">
      <Window title="my wishlist ♡" tone="pink" icon="♥">
        {!token ? <div className="empty"><span className="bigheart">♡</span><p>log in to see the items saved to your account.</p><Link className="btn" to="/login">log in ♡</Link></div>
          : loading ? <div className="empty" role="status">loading your saved finds…</div>
          : error ? <div className="empty" role="alert"><p>{error}</p><button className="btn" onClick={() => { setLoading(true); getWishlistRequest(token).then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}>try again</button></div>
          : items.length ? <div className="wishlist">{items.map((item) => {
            const latest = Number(item.latestPrice ?? item.savedPrice);
            const difference = Number(item.savedPrice) - latest;
            return <article className="wish" key={item.productKey}>
              {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <div className="noimg">no image</div>}
              <b>{item.title}</b><span className="storeline"><strong>{item.store}</strong></span>
              <div className="savedprices"><span>saved at <b>{money(item.savedPrice)}</b></span><span>latest <b>{money(latest)}</b></span>
                {difference > 0 ? <small className="saving">{money(difference)} cheaper since you saved</small> : difference < 0 ? <small>up {money(-difference)} since you saved</small> : <small>same price as when saved</small>}
              </div>
              <div className="row">
                {item.url ? <a className="btn tiny" href={item.url} target="_blank" rel="noopener noreferrer">view at store ↗</a> : <span className="btn tiny blue">store link unavailable</span>}
                <button className="btn blue tiny" aria-label={`remove ${item.title}`} disabled={removing === item.productKey} onClick={() => remove(item)}><Trash2 size={14} /></button>
              </div>
            </article>;
          })}</div>
          : <div className="empty"><span className="bigheart">♡</span><p>nothing saved yet. tap the heart on a live result to keep it here.</p><Link className="btn" to="/search">start scouting →</Link></div>}
      </Window>
    </main>
    <Ticker /><Footer />
  </>;
}
