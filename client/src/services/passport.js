// Style Passport + search history: API calls and one shared copy for the whole site.
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function call(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api/profile${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const getProfileRequest = (token) => call(token, '');
export const updateProfileRequest = (token, body) => call(token, '', { method: 'PUT', body });
export const deleteProfileDataRequest = (token) => call(token, '/data', { method: 'DELETE' });
export const getHistoryRequest = (token) => call(token, '/history');
export const addHistoryRequest = (token, entry) => call(token, '/history', { method: 'POST', body: entry });
export const deleteHistoryItemRequest = (token, id) => call(token, `/history/${id}`, { method: 'DELETE' });
export const clearHistoryRequest = (token) => call(token, '/history', { method: 'DELETE' });

// Records a search for a logged-in user. Never blocks or breaks the search itself.
export function recordSearch(token, entry) {
  if (!token || !entry?.query) return;
  addHistoryRequest(token, entry).catch(() => {});
}

// ---- shared profile copy (so every page/card reads the same passport) ----
let cache = { token: null, profile: null, loading: false };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(cache.profile));

export function setPassportCache(profile) {
  cache = { ...cache, profile };
  if (profile?.sizes) { try { localStorage.setItem('ss_sizes', JSON.stringify(profile.sizes)); } catch { /* ignore */ } }
  emit();
}

export function usePassport() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(cache.token === token ? cache.profile : null);
  useEffect(() => {
    listeners.add(setProfile);
    return () => listeners.delete(setProfile);
  }, []);
  useEffect(() => {
    if (!token) { cache = { token: null, profile: null, loading: false }; setProfile(null); return; }
    if (cache.token === token && (cache.profile || cache.loading)) { setProfile(cache.profile); return; }
    cache = { token, profile: null, loading: true };
    getProfileRequest(token)
      .then((p) => { if (cache.token === token) { cache.loading = false; setPassportCache(p); } })
      .catch(() => { cache.loading = false; });
  }, [token]);
  return profile;
}

// ---- options shown on the passport page ----
export const OPTIONS = {
  shoppingFor: [['women', 'Women'], ['men', 'Men'], ['unisex', 'Unisex'], ['kids', 'Kids']],
  ageRange: [['under-18', 'under 18'], ['18-24', '18–24'], ['25-34', '25–34'], ['35-44', '35–44'], ['45+', '45+']],
  budget: [['u1k', 'under ₹1K'], ['1-2.5k', '₹1–2.5K'], ['2.5-5k', '₹2.5–5K'], ['5k+', '₹5K+']],
  styles: [['y2k', 'Y2K'], ['streetwear', 'Streetwear'], ['casual', 'Casual'], ['formal', 'Formal'], ['ethnic', 'Ethnic'], ['minimal', 'Minimal'], ['athleisure', 'Athleisure'], ['boho', 'Boho'], ['vintage', 'Vintage'], ['party', 'Party']],
  colours: [['black', '#111'], ['white', '#fff'], ['blue', '#3b6cf6'], ['pink', '#f487df'], ['red', '#e23b3b'], ['green', '#2fa35a'], ['beige', '#e8d8b8'], ['brown', '#7a4b2a'], ['grey', '#9aa0a6'], ['purple', '#806cf5'], ['yellow', '#f5d33b'], ['orange', '#f58a3b']],
  stores: [['myntra', 'Myntra'], ['ajio', 'Ajio'], ['amazon', 'Amazon'], ['flipkart', 'Flipkart'], ['h&m', 'H&M'], ['zara', 'Zara'], ['nykaa fashion', 'Nykaa Fashion'], ['tata cliq', 'Tata CLiQ'], ['snitch', 'Snitch'], ['bewakoof', 'Bewakoof'], ['souled store', 'The Souled Store'], ['meesho', 'Meesho']],
};
export const BUDGET_MAX = { u1k: 1000, '1-2.5k': 2500, '2.5-5k': 5000, '5k+': Infinity };

// Words that suggest a style, used for the "matches your style" tick.
const STYLE_WORDS = {
  y2k: /y2k|baby tee|crop|low rise|butterfly|metallic|glitter/i,
  streetwear: /oversized|street|cargo|graphic|hoodie|baggy|sneaker/i,
  casual: /casual|t-?shirt|tee|denim|jeans|polo/i,
  formal: /formal|blazer|trouser|shirt|suit|office/i,
  ethnic: /kurta|saree|sari|lehenga|ethnic|sherwani|dupatta|anarkali|salwar/i,
  minimal: /solid|plain|basic|minimal|essential/i,
  athleisure: /track|jogger|sports|gym|active|running/i,
  boho: /boho|floral|tiered|peasant|embroidered/i,
  vintage: /vintage|retro|washed|distressed/i,
  party: /party|sequin|satin|bodycon|slip dress/i,
};

// How well one live offer fits this passport. Returns ticks to show and a score for "for you" sorting.
export function fitFor(p, passport) {
  if (!passport) return { ticks: [], score: 0 };
  const ticks = [];
  const title = `${p.title || ''}`.toLowerCase();
  const store = `${p.store || ''}`.toLowerCase();
  const pay = p.finalPrice ?? p.price;
  const max = BUDGET_MAX[passport.budget];
  if (max && pay <= max) ticks.push('within your budget');
  if ((passport.stores || []).some((s) => store.includes(s.replace(' fashion', '').replace(' store', '')))) ticks.push('your favourite store');
  if ((passport.brands || []).some((b) => b && title.includes(b.toLowerCase()))) ticks.push('a brand you like');
  if ((passport.styles || []).some((s) => STYLE_WORDS[s]?.test(title))) ticks.push('matches your style');
  if ((passport.colours || []).some((c) => new RegExp(`\\b${c}\\b`, 'i').test(title))) ticks.push('a colour you like');
  const over = max && pay > max ? -2 : 0;
  return { ticks, score: ticks.length * 2 + over };
}
