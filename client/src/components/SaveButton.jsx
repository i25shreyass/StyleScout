import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteWishlistItemRequest, getWishlistRequest, saveWishlistItemRequest, subscribeWishlist, wishlistHas } from '../services/api';
import { toast } from './Ui';

export default function SaveButton({ product, query = '' }) {
  const { token } = useAuth();
  const productKey = product?.productKey || product?.id;
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeWishlist(() => setRevision((n) => n + 1)), []);
  useEffect(() => {
    if (token) getWishlistRequest(token).catch((error) => toast(error.message));
  }, [token]);

  const saved = Boolean(token && productKey && (revision >= 0) && wishlistHas(productKey));
  const toggle = async (event) => {
    event?.stopPropagation();
    if (!token) { toast('log in to save ♡'); return; }
    if (!productKey || !product?.title || !Number.isFinite(Number(product.price))) { toast('this item cannot be saved right now'); return; }
    setBusy(true);
    try {
      if (saved) await deleteWishlistItemRequest(token, productKey);
      else await saveWishlistItemRequest(token, product, query);
      toast(saved ? 'removed from wishlist' : 'saved to your wishlist ♡');
    } catch (error) {
      toast(error.message || 'could not update your wishlist');
    } finally {
      setBusy(false);
    }
  };

  return <button type="button" className={`heart${saved ? ' saved' : ''}`} aria-label={saved ? 'remove from wishlist' : 'save to wishlist'} aria-pressed={saved} disabled={busy} onClick={toggle}>{saved ? '♥' : '♡'}</button>;
}
