# StyleScout — Team & AI Context

> Paste this file into your AI assistant (ChatGPT, Claude, Copilot, etc.) at the start of a session so it understands the project. It contains **no secrets** — those are shared privately.

## 1. What StyleScout is
A Y2K "Dollhouse"-styled **fashion price-comparison website** for India (college group project).
**USP:** "Find my exact size at the lowest final payable price" — final price = item price + delivery (later: coupons/cashback).

- Live site: https://stylescout-twyy.onrender.com
- Health check: https://stylescout-twyy.onrender.com/api/health
- Repo: https://github.com/i25shreyass/StyleScout (owner: i25shreyass)

## 2. Tech stack
- **Client:** React + Vite (`client/`), react-router-dom, lucide-react icons. Fonts: DM Sans, Pixelify Sans, Rubik.
- **Server:** Node.js + Express, ES modules (`server/`), Mongoose.
- **Database:** MongoDB Atlas (cloud, shared by the team).
- **Product search:** SerpApi — Google Shopping (text/link search) and Google Lens (photo search), India (`gl=in`).
- **Email:** Brevo HTTP API (verification + password reset). **Captcha:** Google reCAPTCHA v2 checkbox.
- **Hosting:** Render free web service. Pushing to `main` auto-deploys. The server serves the built client from `client/dist`. Free tier sleeps after 15 min idle (first load ~1 min).

## 3. Folder map (important files)
```
package.json                 root scripts: install:all, dev, build, start
client/
  vite.config.js             dev proxy: /api -> http://localhost:5001
  src/App.jsx                all routes + SearchPage (text, link, photo search), LiveCard
  src/components/Ui.jsx      Window, TopNav, toast, Footer, decorative bits
  src/services/api.js        all fetch calls to the server
  src/pages/                 Login, VerifyEmail, ResetPassword
  src/context/AuthContext.jsx
  src/styles.css             Dollhouse theme
server/
  index.js                   Express app, CORS, rate limits, static serving
  routes/auth.js             signup/login/verify/forgot/reset (DONE — don't change without asking)
  routes/search.js           GET /api/search?q= , POST /api/search/link , POST /api/search/image
  services/shopping.js       SerpApi calls, key rotation, caching, deal scoring
  services/linkReader.js     reads a pasted product link -> search words (SSRF-protected)
  models/                    User, SearchCache (12h cache), PriceSnapshot (price history)
  .env.example               list of required settings (no values)
```

## 4. Run it locally
Requirements: Node.js 20+, Git, VS Code.
```bash
git clone https://github.com/i25shreyass/StyleScout
cd StyleScout
npm install
npm run install:all
# create server/.env and client/.env (values shared privately — see section 5)
npm run dev
```
- Website: http://localhost:5173  ·  API: http://localhost:5001
- Restart `npm run dev` (Ctrl+C, then run again) after changing `.env` or `vite.config.js`.

## 5. Secret settings (never commit, never paste in public chats)
`server/.env` keys: `PORT=5001`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `RECAPTCHA_SECRET`, `EMAIL_*` (Brevo), `SERPAPI_KEYS`, `SEARCH_RESULT_LIMIT`, `SEARCH_CACHE_HOURS`.
`client/.env` key: `VITE_RECAPTCHA_SITE_KEY`.
- `.env` files are git-ignored on purpose.
- **SerpApi:** each teammate creates a free key at serpapi.com and sends it to Shreyas. Keys are combined as `SERPAPI_KEYS=key1,key2,key3`; the server switches to the next key when one runs out. Free plan = 250 searches/month per key. **1 search = 1 API call, regardless of results count.** Repeat searches within 12h are cached (free).

## 6. Status
**Done:** login/signup, email verification, forgot password, reCAPTCHA, Render deploy · Sprint 1 live text search · Sprint 2 product-link search (confirm step, "likely same item", "₹X cheaper") · Sprint 3 photo search (Google Lens; upload works only on the live site, links to photos work locally).

**Next:** Sprint 4 deal layer (size picker, delivery cost, below-average badge, "checked at" time, manual price box for blocked store links) · then price-drop alert emails, wishlist saved to DB, price-history chart, real compare page, demo prep.

**Known limits:** Myntra/Ajio/Amazon block page reading (price "not readable"); we do NOT try to bypass bot protection. "View at store" often opens the Google Shopping offer page. Size/colour filters only apply to demo products in live mode.

## 7. Team rules
1. **Pull first** (`git pull` / Sync Changes) before you start.
2. **One branch per task** (e.g. `wishlist-page`), push it, open a Pull Request; Shreyas reviews and merges.
3. **Only working code goes to `main`** — it deploys live immediately.
4. **Split by area** so two people don't edit `App.jsx` at the same time.
5. **Don't change the auth/login flow** without discussing it.
6. Test searches sparingly — they use shared quota.

## 8. Design rules (for AI-generated UI)
White background; blue/pink tints on hover; content in rectangular "Window" sections with a title bar (use the `Window` component from `Ui.jsx`). Minimise/maximise/close buttons **only on pop-ups** (`popup` prop). Playful lowercase Y2K copy ("scouting stores…", "♡"). Avoid liquid-chrome styling.

## 9. Notes for AI assistants
- Server uses ES modules (`import`), not `require`.
- Client calls the API with relative paths (`/api/...`); don't hardcode localhost.
- Keep secrets out of code; read them from `process.env`.
- Prefer small, focused changes; explain them in plain language (some teammates are non-coders).
