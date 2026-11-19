import React from 'react';
import { OPTIONS } from '../services/passport';

// The Style Passport questions, shared by:
//   - the one-time "personalise" step right after registering (skin="holo", login look)
//   - the profile page (skin="site", regular website look)
export const SIZE_OPTS = {
  top: ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  bottom: ['', '26', '28', '30', '32', '34', '36', '38', '40', 'XS', 'S', 'M', 'L', 'XL'],
  shoe: ['', 'UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'],
};
export const EMPTY_PASSPORT = { shoppingFor: [], ageRange: '', budget: '', styles: [], colours: [], stores: [], brands: [], keepHistory: true, priceAlertEmails: true, newsEmails: false };
export const EMPTY_SIZES = { top: '', bottom: '', shoe: '' };

function Chips({ options, value, onChange, multi = false, label }) {
  const on = (v) => (multi ? value.includes(v) : value === v);
  const flip = (v) => (multi ? onChange(on(v) ? value.filter((x) => x !== v) : [...value, v]) : onChange(on(v) ? '' : v));
  return (
    <div className="pf-chips" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={on(v) ? 'on' : ''} aria-pressed={on(v)} onClick={() => flip(v)}>{text}</button>
      ))}
    </div>
  );
}

function Section({ title, why, children }) {
  return (
    <fieldset className="pf-sec">
      <legend>{title}</legend>
      {why && <p className="pf-why">{why}</p>}
      {children}
    </fieldset>
  );
}

// value = { sizes, passport, brandText }; onChange receives the next value
export default function PassportFields({ value, onChange, skin = 'site', showAge = true }) {
  const { sizes, passport: pp, brandText } = value;
  const set = (k) => (v) => onChange({ ...value, passport: { ...pp, [k]: v } });
  return (
    <div className={`pf ${skin}`}>
      <Section title="who are you shopping for?" why="so women's, men's, unisex or kids' items come first">
        <Chips label="shopping for" multi options={OPTIONS.shoppingFor} value={pp.shoppingFor} onChange={set('shoppingFor')} />
      </Section>

      <Section title="your sizes" why="we check your size on store pages and remind you before you buy">
        <div className="pf-sizes">
          {[['top', 'top'], ['bottom', 'bottom'], ['shoe', 'shoes']].map(([k, t]) => (
            <label key={k}><span>{t}</span>
              <select value={sizes[k] || ''} onChange={(e) => onChange({ ...value, sizes: { ...sizes, [k]: e.target.value } })}>
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
        <div className="pf-swatches" role="group" aria-label="colours">
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
        <div className="pf-checks">
          {OPTIONS.stores.map(([v, t]) => (
            <label key={v}><input type="checkbox" checked={pp.stores.includes(v)} onChange={(e) => set('stores')(e.target.checked ? [...pp.stores, v] : pp.stores.filter((x) => x !== v))} /> <span>{t}</span></label>
          ))}
        </div>
      </Section>

      <Section title="favourite brands" why="optional · separate with commas">
        <input className="pf-text" value={brandText} onChange={(e) => onChange({ ...value, brandText: e.target.value })} placeholder="e.g. Levi's, H&M, Rare Rabbit" aria-label="favourite brands" />
      </Section>

      {showAge && (
        <Section title="age range" why="optional · helps age-appropriate suggestions">
          <Chips label="age range" options={OPTIONS.ageRange} value={pp.ageRange} onChange={set('ageRange')} />
        </Section>
      )}
    </div>
  );
}

// Turns the form value into what the server expects.
export const toPayload = ({ sizes, passport, brandText }) => ({
  sizes,
  passport: { ...passport, brands: String(brandText || '').split(',').map((b) => b.trim()).filter(Boolean) },
});
