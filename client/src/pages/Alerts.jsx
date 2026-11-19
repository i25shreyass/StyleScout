import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteAlertRequest, getAlertsRequest, updateAlertRequest } from '../services/api';
import { Window, TopNav, Ticker, Footer, toast } from '../components/Ui';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function Alerts() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    if (!token) { setAlerts([]); setLoading(false); setError(''); return; }
    setLoading(true);
    setError('');
    try {
      const data = await getAlertsRequest(token);
      setAlerts(data);
      setDrafts(Object.fromEntries(data.map((item) => [item._id, String(item.targetPrice)])));
    } catch (e) { setError(e.message || 'could not load your alerts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const update = async (alert, changes, success) => {
    setBusyId(alert._id);
    try {
      const next = await updateAlertRequest(token, alert._id, changes);
      setAlerts((items) => items.map((item) => item._id === alert._id ? next : item));
      if (changes.targetPrice !== undefined) setDrafts((current) => ({ ...current, [alert._id]: String(next.targetPrice) }));
      toast(success);
    } catch (e) { toast(e.message || 'could not update this alert'); }
    finally { setBusyId(''); }
  };

  const remove = async (alert) => {
    setBusyId(alert._id);
    try {
      await deleteAlertRequest(token, alert._id);
      setAlerts((items) => items.filter((item) => item._id !== alert._id));
      toast('price alert removed');
    } catch (e) { toast(e.message || 'could not remove this alert'); }
    finally { setBusyId(''); }
  };

  return <>
    <TopNav />
    <main className="page">
      <Window title="my price alerts ♫" tone="pink" className="alerts-page-window" icon="🔔">
        {!token ? <div className="empty"><p>log in to manage your price alerts.</p><Link className="btn" to="/login">log in ♡</Link></div>
          : loading ? <div className="empty" role="status">loading your alerts…</div>
          : error ? <div className="empty" role="alert"><p>{error}</p><button className="btn" onClick={load}>try again</button></div>
          : alerts.length ? <div className="alerts-page-grid">{alerts.map((alert) => <article key={alert._id} className="alerts-page-card">
            {alert.image ? <img className="alerts-page-thumbnail" src={alert.image} alt={alert.title} loading="lazy" /> : <div className="alerts-page-thumbnail-fallback">no image</div>}
            <div className="alerts-page-details">
              <b className="alerts-page-title">{alert.title}</b>
              <small className="alerts-page-meta">{alert.store || 'store unavailable'} · last checked {alert.lastCheckedAt ? new Date(alert.lastCheckedAt).toLocaleString() : 'not checked yet'}</small>
              <div className="alerts-page-price-grid">
                <span className="alerts-page-current">current <b>{alert.lastPrice != null ? money(alert.lastPrice) : 'unknown'}</b></span>
                <label className="alerts-page-target">target
                  <input className="alerts-page-target-input" aria-label={`target price for ${alert.title}`} type="number" min="0" step="1" value={drafts[alert._id] ?? alert.targetPrice} onChange={(event) => setDrafts((current) => ({ ...current, [alert._id]: event.target.value }))} />
                </label>
                <button className="btn tiny alerts-page-save-target" disabled={busyId === alert._id} onClick={() => {
                  const targetPrice = Number(drafts[alert._id]);
                  if (!Number.isFinite(targetPrice) || targetPrice < 0) { toast('enter a valid target price'); return; }
                  update(alert, { targetPrice }, 'target price updated');
                }}>save target</button>
              </div>
              <div className="alerts-page-actions">
                <button className="btn tiny blue" disabled={busyId === alert._id} onClick={() => update(alert, { active: !alert.active }, alert.active ? 'alert paused' : 'alert resumed')}>{alert.active ? 'pause' : 'resume'}</button>
                {alert.url && <a className="btn tiny" href={alert.url} target="_blank" rel="noopener noreferrer">view at store ↗</a>}
                <button className="btn tiny" disabled={busyId === alert._id} onClick={() => remove(alert)}>delete</button>
                <small className="alerts-page-status">{alert.active ? 'active' : 'paused'}</small>
              </div>
            </div>
          </article>)}</div>
          : <div className="empty"><span className="bigheart">🔔</span><p>no price alerts yet. set one from a live search result.</p><Link className="btn" to="/search">start scouting →</Link></div>}
      </Window>
    </main>
    <Ticker /><Footer />
  </>;
}
