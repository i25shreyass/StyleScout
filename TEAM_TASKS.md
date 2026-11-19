# StyleScout: Work Division (4 teammates + Shreyas)

> Read `TEAM_CONTEXT.md` first. Paste both files into your AI assistant before you start.
> Time box: about **6 hours** of build time, then 2 hours for merging, testing and the demo.

## How the split avoids conflicts
Each person owns **their own new files**: a page, a route and a model. The only shared files are `client/src/App.jsx` (routes and the card), `server/index.js` (mounting routes) and `client/src/services/api.js`. The rules for those:
- **Add, don't edit.** In `App.jsx` you may add **one `<Route>` line** and **one import**. Put all your UI in your own file under `client/src/pages/` or `client/src/components/`.
- **`api.js`:** append your functions at the end, under a comment with your name.
- **`server/index.js`:** add one `import` and one `app.use('/api/...')`. Shreyas resolves any merge clash here.
- **Don't touch** `routes/auth.js`, `services/shopping.js`, `services/linkReader.js` or `routes/search.js`. Ask Shreyas if you need something from them.

## Shared data contract: the "live product"
Every search result (from `GET /api/search?q=` and `POST /api/search/image`) looks like this. Store and pass **this shape**, and don't invent a new one:
```js
{
  id: "g-123..." | "l-...",     // stable key, also used in PriceSnapshot.productKey
  title, store, url, image,
  price,                        // item price in ₹ (number)
  originalPrice, discount,
  delivery,                     // number, or null = unknown ("check at store")
  finalPrice,                   // price + delivery, or null when delivery unknown
  rating, reviews,
  belowTypical, dealScore,
  lowestSeen, droppedBy         // price-history badges (may be missing)
}
// plus, from the response: query (the search words) and fetchedAt
```
Price history is already being saved: **`server/models/PriceSnapshot.js`** `{ productKey, title, store, price, delivery, query, at }`, one row per product per live search.
To call protected routes, the logged-in token is `useAuth().token`. Send it as `Authorization: Bearer <token>`. Server middleware: `server/middleware/auth.js` (sets `req.user.id`).

## Search quota rule (important)
We have about 250 live searches per key per month. **Don't call SerpApi in loops or on a timer without a cap.** Prefer reading `SearchCache` and `PriceSnapshot` from MongoDB (free). If you need fresh prices, call `searchProducts(query)` from `services/shopping.js`. It uses the 12-hour cache automatically.

---

## Teammate 1: Wishlist (saved to the account)
**Branch:** `wishlist`
**Goal:** users tap ♡ on any live result to save it, then see their saved items with the latest known price.

Server:
- Rework `server/models/WishlistItem.js` → `{ user, productKey, title, store, url, image, query, savedPrice, savedAt }`, with a unique index on `{ user, productKey }`.
- `server/routes/wishlist.js` (already mounted at `/api/wishlist`, auth required):
  - `GET /`: the user's items, each with `latestPrice` = newest `PriceSnapshot.price` for that `productKey` (fall back to `savedPrice`).
  - `POST /`: body = live product (+ `query`). Upsert, and don't create duplicates.
  - `DELETE /:productKey`
Client:
- `client/src/components/SaveButton.jsx`: ♡ toggle, which takes `product` and `query`. When logged out, show a toast "log in to save ♡".
- `client/src/pages/Wishlist.jsx`: grid of saved items using the `Window` component. Show the saved price vs latest price ("₹120 cheaper since you saved"), remove button, and "view at store".
- Hand-off to Shreyas: one line to put `<SaveButton>` on `LiveCard`, and swap the `/wishlist` route to your page.

**Done when:** save → refresh page → item still there; works on two devices with the same login; no duplicates.

## Teammate 2: Price-drop alerts (email)
**Branch:** `alerts`
**Goal:** "Email me when this drops below ₹X."

Server:
- `server/models/Alert.js` → `{ user, productKey, title, store, url, image, query, targetPrice, lastPrice, active, lastCheckedAt, notifiedAt }`
- `server/routes/alerts.js` (mount at `/api/alerts`, auth): `GET /`, `POST /` (needs product + query + targetPrice), `PATCH /:id` (targetPrice, active), `DELETE /:id`.
- `server/services/alertChecker.js`: `runAlertCheck()`:
  1. Load active alerts and **group them by `query`** (one search serves many alerts).
  2. For each query, call `searchProducts(query)` (cached, so it's often free). Cap it at **10 fresh searches per run**.
  3. Find the matching `productKey` in the results. If `price <= targetPrice` and no email was sent in the last 24 h, send an email using the existing `server/utils/mailer.js` (read how it sends verification mail and reuse it).
- Trigger: `POST /api/alerts/run-check` protected by a header `x-cron-key` that must equal `process.env.CRON_KEY`. (Render free has no background workers; we'll call this from a free scheduler such as cron-job.org once or twice a day, or press it manually in the demo.)
Client:
- `client/src/components/AlertButton.jsx`: small "🔔 alert me" pop-up with a target-price input (default: 10% below the current price).
- `client/src/pages/Alerts.jsx`: list, edit target, pause, delete.
- Email template: Y2K-styled, with product image, old price → new price, and a store link.

**Done when:** create an alert with a target **above** the current price → hit run-check → email arrives once (not on every run).

## Teammate 3: Price history and the Compare page
**Branch:** `history-compare`
**Goal:** show how a product's price moved over time, and let users compare up to 4 offers side by side.

Server:
- `server/routes/history.js` (mount at `/api/history`, public):
  - `GET /:productKey` → `{ title, store, points: [{ at, price }], min, max, avg, current }` from `PriceSnapshot` (sorted, max 200 points).
  - `GET /search?q=` → per-day **lowest** price across all stores for that query (from `PriceSnapshot.query`), for a "this search's price trend" chart.
Client:
- `client/src/components/PriceChart.jsx`: lightweight **hand-drawn SVG line chart** (no chart library needed), with dots, min/max labels and a "lowest" marker. Show "not enough history yet" when there's 1 point.
- `client/src/components/CompareButton.jsx`: "+ compare" toggle. Store up to 4 live products in `localStorage` key `ss_compare`.
- `client/src/pages/Compare.jsx`: table of you-pay price, item price, delivery, store, rating, discount, history min, and "view at store". Highlight the cheapest final price.
- `client/src/pages/ProductHistory.jsx`: route `/history/:productKey` with the chart and stats.
- Hand-off: one line to put `<CompareButton>` and a "price history" link on `LiveCard`, and swap the `/compare` route.

**Done when:** add 3 items to compare → open /compare → cheapest is highlighted; the history page renders for a product searched at least once.

## Teammate 4: Profile, quality, mobile and demo
**Branch:** `polish-demo`
**Goal:** the site works smoothly on a phone and the demo can't fail.

- `client/src/pages/Profile.jsx`: name, email, logout, "my sizes" (reuse `SizePicker` and `useSizes` from `App.jsx`; ask Shreyas to export them into `client/src/components/Sizes.jsx`), and links to the wishlist and alerts.
- **Mobile pass:** test every page at 375 px width (Chrome DevTools → phone). Fix overflow, tiny buttons and the filter panel (collapse it into a "filters" button on mobile). Put fixes at the **end of `styles.css`** under a `/* mobile fixes */` comment.
- **Empty and error states:** logged-out wishlist/alerts pages, server asleep (Render takes about 1 min to wake; show "waking up the server…"), and the quota exhausted message.
- **Demo kit:**
  - A list of 5 searches that give great results (and are already cached, so they're free), plus 2 product links and 2 photos that work well.
  - The pitch: problem → USP ("exact size, lowest final payable price") → live demo → tech stack diagram → what's next.
  - The slide deck, and a 2-minute backup screen recording in case the internet fails.
- **Final QA checklist** run on the live site after every merge.

**Done when:** a full run-through on a phone works without help, and the deck and recording are ready.

## Shreyas (lead)
- Hands out keys and `.env` values privately, and reviews and merges Pull Requests into `main`.
- Does the `LiveCard` hook-ups (Save, Alert, Compare buttons) and exports `Sizes.jsx`.
- Adds new env vars on Render (`CRON_KEY`) and sets up the cron-job.org call.
- Watches the search quota and adds teammates' keys to `SERPAPI_KEYS`.

## Timeline
| Time | Milestone |
|---|---|
| +0:30 | Everyone set up locally, branches created |
| +3:00 | Server routes working (test with browser/Thunder Client), first PRs opened |
| +5:00 | Pages done; Shreyas merges in order: Teammate 3 → Teammate 1 → Teammate 2 → Teammate 4 |
| +6:00 | Feature freeze. Only bug fixes after this |
| +6–8 | Live-site QA, demo rehearsal |

## Pull Request checklist
- [ ] `npm run dev` runs with no errors in the terminal or the browser console
- [ ] Only my own files changed, plus the allowed one-line additions
- [ ] No secrets in code; any new env var added to `server/.env.example`
- [ ] Tested logged in **and** logged out
- [ ] Used fewer than 5 live searches while testing
