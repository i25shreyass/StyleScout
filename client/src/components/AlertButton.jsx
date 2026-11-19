import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { createAlertRequest } from '../services/api';
import { Window, toast } from './Ui';

export default function AlertButton({ product, query = '', icon = false }) {
  const { token } = useAuth();
  const initialTarget = Math.max(0, Math.round(Number(product?.price) * 0.9));
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(String(initialTarget));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const start = () => {
    if (!token) { toast('log in to set a price alert ♡'); return; }
    if (query.trim().toLowerCase() === 'photo') { toast('price alerts need a text search query'); return; }
    if (!product?.id || !product?.title || !Number.isFinite(Number(product.price)) || !query.trim()) {
      toast('this item cannot have a price alert right now');
      return;
    }
    setTarget(String(initialTarget));
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const value = Number(target);
    if (!Number.isFinite(value) || value < 0) { toast('enter a valid target price'); return; }
    setBusy(true);
    try {
      await createAlertRequest(token, product, query, value);
      setOpen(false);
      toast('price alert saved ♫');
    } catch (error) {
      toast(error.message || 'could not save this price alert');
    } finally { setBusy(false); }
  };

  return <div className={`alert-popup-trigger${icon ? ' iconmode' : ''}`}>
    {icon
      ? <button type="button" className="bell" data-tip="price-drop alert" aria-label="set a price-drop alert" onClick={(event) => { event.stopPropagation(); start(); }}>🔔</button>
      : <button type="button" className="btn tiny blue" onClick={(event) => { event.stopPropagation(); start(); }}>🔔 alert me</button>}
    {open && createPortal(
      <div className="alert-popup-backdrop" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="alert-popup-position" role="dialog" aria-modal="true" aria-label="set a price alert" onClick={(event) => event.stopPropagation()}>
          <Window title="price alert ♫" tone="pink" popup icon="🔔" className="alert-popup" onClose={() => setOpen(false)}>
            <form className="alert-popup-form" onSubmit={submit}>
              <div className="alert-popup-product">
                {product.image
                  ? <img className="alert-popup-image" src={product.image} alt="" />
                  : <div className="alert-popup-image-fallback">no image</div>}
                <div className="alert-popup-copy">
                  <b>{product.title}</b>
                  <small>{product.store}</small>
                  <span>current price <strong>₹{Number(product.price).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
              <label className="alert-popup-field">alert me below
                <input type="number" min="0" step="1" value={target} onChange={(event) => setTarget(event.target.value)} required />
              </label>
              <div className="alert-popup-actions">
                <button className="btn tiny blue" type="button" onClick={() => setOpen(false)}>cancel</button>
                <button className="btn tiny" type="submit" disabled={busy}>{busy ? 'saving…' : 'save alert ♫'}</button>
              </div>
            </form>
          </Window>
        </div>
      </div>,
      document.body,
    )}
  </div>;
}
