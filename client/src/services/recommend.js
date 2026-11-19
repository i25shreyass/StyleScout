// "For you" homepage ordering: a rule-based decision tree (analytical hierarchy), not machine learning.
// It uses only the shopper's Style Passport + what's available in the scouted products.
//
// Hierarchy (higher levels always outrank lower ones):
//   1. WHO   - shopping for (women / men / unisex / kids)       -> category order + item fit
//   2. MONEY - usual budget                                      -> within budget first
//   3. STYLE - vibe (y2k, streetwear, ethnic …)                  -> category boost + style words
//   4. TASTE - favourite stores, brands, colours                 -> small boosts
//   5. DEAL  - deal score / discount                             -> tie-breaker
// Guests (no passport): a varied mix that changes every day, ordered by deals.

import { BUDGET_MAX, fitFor } from './passport';

// Which homepage categories suit each audience (category keys come from server/services/featured.js).
const AUDIENCE_CATS = {
  women: ['women-tops', 'dresses', 'ethnic-women', 'heels', 'bags', 'denim', 'sneakers', 'accessories'],
  men: ['men-tees', 'ethnic-men', 'denim', 'sneakers', 'accessories'],
  unisex: ['denim', 'sneakers', 'accessories', 'men-tees', 'women-tops'],
  kids: ['sneakers', 'denim'],
};
// Which categories each vibe leans towards.
const STYLE_CATS = {
  y2k: ['women-tops', 'denim', 'bags', 'accessories'],
  streetwear: ['sneakers', 'men-tees', 'denim'],
  casual: ['men-tees', 'women-tops', 'denim', 'sneakers'],
  formal: ['men-tees', 'heels', 'bags', 'accessories'],
  ethnic: ['ethnic-women', 'ethnic-men'],
  minimal: ['men-tees', 'women-tops', 'accessories'],
  athleisure: ['sneakers', 'men-tees'],
  boho: ['dresses', 'ethnic-women', 'bags'],
  vintage: ['denim', 'accessories', 'dresses'],
  party: ['dresses', 'heels', 'bags'],
};

const audienceOf = (title) => {
  const t = String(title || '').toLowerCase();
  if (/\b(kids?|boys?|girls?|baby|infants?|toddlers?|junior)\b/.test(t)) return 'kids';
  if (/\bunisex\b/.test(t)) return 'unisex';
  const w = /\b(women|woman|womens|women's|ladies|lady|female)\b/.test(t);
  const m = /\b(men|man|mens|men's|male|gents)\b/.test(t);
  if (w && !m) return 'women';
  if (m && !w) return 'men';
  return w && m ? 'unisex' : null;
};

// Level 1 + 3: order categories for this passport. Returns [{ key, score, reason }].
export function rankCategories(categories, passport) {
  const who = passport?.shoppingFor || [];
  const styles = passport?.styles || [];
  return categories.map((c, i) => {
    let score = 0;
    const why = [];
    if (who.length) {
      const fits = who.some((a) => (AUDIENCE_CATS[a] || []).includes(c.key));
      score += fits ? 100 : -100;            // level 1 dominates
      if (fits) why.push('for you');
    }
    const styleHits = styles.filter((s) => (STYLE_CATS[s] || []).includes(c.key));
    score += styleHits.length * 10;           // level 3
    if (styleHits.length) why.push(styleHits.join(', '));
    score -= i * 0.01;                         // keep the original order as the final tie-break
    return { ...c, score, why };
  }).sort((a, b) => b.score - a.score);
}

// Levels 1-5 for one product. Higher = shown earlier.
export function scoreItem(p, passport) {
  let s = 0;
  const who = passport?.shoppingFor || [];
  if (who.length) {
    const a = audienceOf(p.title);
    if (a && who.includes(a)) s += 1000;
    else if (a === 'unisex' && who.some((x) => x !== 'kids')) s += 800;
    else if (a && !who.includes(a)) s -= 1000;   // clearly for someone else -> bottom
  }
  const max = BUDGET_MAX[passport?.budget];
  const pay = p.finalPrice ?? p.price;
  if (max) s += pay <= max ? 300 : -300 - Math.min(200, (pay - max) / 50);
  const fit = fitFor(p, passport);                // style / store / brand / colour ticks
  s += fit.ticks.filter((t) => t === 'matches your style').length * 60;
  s += fit.ticks.filter((t) => t !== 'matches your style' && t !== 'within your budget').length * 25;
  s += Math.max(-10, Math.min(30, p.dealScore || 0));   // level 5: tie-breaker
  return s;
}

// Simple seeded shuffle so guests see a different (but stable for the day) mix.
function seeded(seed) {
  let x = seed % 2147483647 || 1;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}
const todaySeed = () => { const d = new Date(); return d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate(); };

// Main entry: returns { cats (ordered, items ordered), everything (mixed list), personal, reasons }
export function personalise(categories, passport) {
  const hasPassport = Boolean(passport && ((passport.shoppingFor || []).length || passport.budget || (passport.styles || []).length || (passport.stores || []).length || (passport.colours || []).length));
  const cats = categories.filter((c) => c.items.length);
  if (!hasPassport) {
    const rnd = seeded(todaySeed());
    const shuffled = cats.map((c) => ({ ...c, why: [], items: [...c.items].map((p) => ({ p, r: rnd() + (p.dealScore || 0) / 200 })).sort((a, b) => b.r - a.r).map((x) => x.p) }))
      .map((c) => ({ c, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.c);
    const everything = [];
    for (let i = 0; i < 200; i += 1) shuffled.forEach((c) => { if (c.items[i]) everything.push(c.items[i]); });
    return { cats: shuffled, everything, personal: false, reasons: [] };
  }

  const ranked = rankCategories(cats, passport).map((c) => ({
    ...c,
    items: [...c.items].map((p) => ({ p, s: scoreItem(p, passport) })).sort((a, b) => b.s - a.s).map((x) => x.p),
  }));
  // "everything": take more items from the categories that rank higher (3 : 2 : 1 …), then score globally.
  const pool = [];
  ranked.forEach((c, i) => {
    const share = c.score >= 100 ? 24 : c.score > 0 ? 12 : c.score > -50 ? 8 : 3;
    pool.push(...c.items.slice(0, share).map((p) => ({ p, s: scoreItem(p, passport) - i * 5 })));
  });
  const seen = new Set();
  const everything = pool.sort((a, b) => b.s - a.s).map((x) => x.p).filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
  ranked.forEach((c) => c.items.forEach((p) => { if (!seen.has(p.id)) { seen.add(p.id); everything.push(p); } }));

  const reasons = [];
  if ((passport.shoppingFor || []).length) reasons.push(passport.shoppingFor.join(' & '));
  const budgetLabel = { u1k: 'under ₹1K', '1-2.5k': '₹1–2.5K', '2.5-5k': '₹2.5–5K', '5k+': '₹5K+' }[passport.budget];
  if (budgetLabel) reasons.push(budgetLabel);
  if ((passport.styles || []).length) reasons.push(passport.styles.slice(0, 3).join(', '));
  if ((passport.stores || []).length) reasons.push(`${passport.stores.length} favourite store${passport.stores.length > 1 ? 's' : ''}`);
  return { cats: ranked, everything, personal: true, reasons };
}
