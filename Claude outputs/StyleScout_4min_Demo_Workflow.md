# StyleScout: 4-Minute Demo Workflow

**Live site:** https://stylescout-twyy.onrender.com
**Format:** one presenter drives the site, one speaks (or one person does both).
**Audience:** shoppers (what it does for them) and the professor (how it is built, and why it is trustworthy).

---

## The one-line pitch

> **StyleScout finds your exact size at the lowest final payable price, across every Indian fashion store, from a search, a product link or a photo.**

## Our USPs (say these out loud at least once)

1. **Final payable price, not the sticker price:** item + delivery, labelled "total from store" or "estimated".
2. **Same item, every store:** Google Shopping's product grouping lines up one exact product across Myntra, Ajio, Amazon and brand stores, sorted by what you actually pay.
3. **"Is my size in stock?":** read from the store's own page where the store shares it (for example Shopify brand stores). We never guess: otherwise it says "check at store".
4. **Three ways to search:** text, a pasted product link, or a photo (look-alikes).
5. **Personal, but private:** the optional Style Passport (sizes, budget, style, favourite stores) ticks offers that fit you. Everything is editable and deletable.

---

## Timeline (4:00)

| Time | Section | Screen |
|---|---|---|
| 0:00–0:25 | Problem and pitch | Homepage |
| 0:25–1:10 | Search and the final price | Search results |
| 1:10–1:50 | Same item, every store, your size | "All stores" pop-up |
| 1:50–2:30 | Link and photo search | Search page |
| 2:30–3:05 | Personalisation and alerts | Profile, then Alerts |
| 3:05–3:40 | Trust and guardrails (for the professor) | Search, then pop-up |
| 3:40–4:00 | Tech stack and close | Homepage |

---

## 0:00–0:25 · Problem and pitch (Homepage)

**Do:** Open the homepage. Scroll once through *scouted today*.

**Say:**
"When you shop for clothes online in India, the price you see is rarely what you pay, and the same item costs different amounts on Myntra, Ajio and Amazon. Checking each store, in your size, with delivery, takes ages. StyleScout does it in one search. Everything you see here is real: about 500 live products across 10 categories."

**Point at:** the category tabs, real store names on cards, the "price drops" list.

---

## 0:25–1:10 · Search and the final price (Search results)

**Do:**
1. Type **`blue denim jacket men`** (pre-loaded the night before), then press scout.
2. Point at a card's **"you pay ₹…"** (item + delivery) and a **"₹X below average"** badge.
3. In FILTERS.exe, set **price range** (type a max, or drag the slider), tap a **colour**, tap **"for: men"**.
4. Change the sort to **"lowest final price"**.

**Say:**
"Every card shows what you actually pay, with delivery included, and a deal badge comparing it to the usual price for this search. Filters work on live results: price range, colour, who it's for, brand and discount."

---

## 1:10–1:50 · Same item, every store, your size (USP)

**Do:**
1. On a card, click **"⇄ all stores for this item"** (pre-opened the night before).
2. Point at: the **"lowest you pay in your size"** line, the per-store rows (item, delivery, **you pay**, **size M**, **returns**), and **product details** (sizes, colours, material) if a brand store is listed.
3. Click **"visit ↗"** on the cheapest row: it opens the **real store page** in a new tab.

**Say:**
"This is our core feature: the same product across every store, sorted by the final price. Where the store shares stock, we check your size directly on its page. Marketplaces that don't share it honestly say 'check at store'. And every button takes you to the actual store page, not a middleman."

---

## 1:50–2:30 · Link and photo search

**Do (pick one, or both if time allows):**
- **Link:** paste a product link (for example a Myntra or brand-store link) into the search box. Show the confirm window, scout it, then point at **"exact matches"** vs **"similar alternatives"** and the **"₹X cheaper than your link"** labels.
- **Photo:** **hover any product photo**: it darkens and shows **"⌕ image search"**. Click it: look-alike products appear, compared against that item's price.

**Say:**
"Found something on Instagram or another store? Paste the link, and we find the same item cheaper. Or just use a photo: StyleScout finds look-alikes and compares their prices."

---

## 2:30–3:05 · Personalisation and alerts

**Do:**
1. Open **Profile** (logged in as the demo account). Show **My Style Passport**: sizes, budget, vibe, colours, favourite stores.
2. Back on results, switch sort to **"for you ♡"**: cards show **✓ within your budget / ✓ your favourite store / ✓ matches your style**.
3. Show **Search history** (one tap to re-run).
4. On a card, tap **🔔**, set a target price, then open **/alerts**.
5. *(Optional live moment)* Run the alert check in a terminal and show the email arriving:
   `curl -X POST https://stylescout-twyy.onrender.com/api/alerts/run-check -H "x-cron-key: YOUR_KEY"`

**Say:**
"Right after signing up, you can optionally tell us your sizes, budget and style. It takes 30 seconds, and every field is optional, editable and deletable. Results then tick what fits you. Set a price alert, and we email you when it drops below your target."

---

## 3:05–3:40 · Trust and guardrails (for the professor)

**Do:**
1. Search **`iphone`**: show the polite **not_fashion.exe** block with fashion suggestions.
2. In the stores pop-up, point at **"total from store" vs "estimated"**, the **"⚠ name differs"** warning (if visible) and **"⚑ report wrong match or price"**.
3. Mention the **"prices checked …"** time in the results header.

**Say:**
"We designed for honesty. Non-fashion searches are blocked before they cost anything. Every price shows when it was checked and whether it's a confirmed total or an estimate. If a store's listing name looks different, we warn you. Users can report a wrong match, and reports are stored for the team to review. We never bypass store bot protection: if a store won't share data, we say so."

---

## 3:40–4:00 · Tech stack and close

**Say:**
"Under the hood: a React and Vite front end, a Node and Express API, and MongoDB Atlas, deployed on Render. Live prices come from Google Shopping and Google Lens through SerpApi, with a 12-hour cache and price-history snapshots, so repeat searches are instant. Accounts use JWT with email verification through Brevo and Google reCAPTCHA. We built it in agile sprints across a five-person team, with branches and pull requests.

StyleScout: find it, compare it, wear it, in your size, at the price you actually pay."

---

## Professor Q&A cheat sheet

| Likely question | Short answer |
|---|---|
| Where does the data come from? | Google Shopping and Google Lens via SerpApi (legal, structured results), plus stores' own public product data (for example Shopify) for sizes. |
| How do you match the same product? | Google Shopping groups listings into one product. We add a name-similarity check that warns when a store's listing looks different, plus user reports. |
| How is "final price" calculated? | Item price + delivery. If the store gives a total, we label it "total from store", otherwise "estimated". Coupons and card offers are excluded and say so. |
| Is size stock reliable? | Only where the store publishes it (for example Shopify stores). Marketplaces like Myntra don't, so we show "check at store" instead of guessing. |
| How do you control API cost? | 12-hour search cache, 24-hour store cache, guardrails that block non-fashion queries, capped alert checks, and multiple API keys with automatic switching. |
| Security and privacy? | bcrypt passwords, JWT, email verification, reCAPTCHA, rate limits, SSRF-protected link reading. All passport fields are optional and deletable, and marketing emails are off by default. |
| Why not scrape stores directly? | Store bot protection, legal terms and reliability. We use official or public structured data only. |
| What's next? | Coupons and cashback, browser extension, restock-by-size alerts, retailer return-policy profiles. |

---

## Night-before checklist

- [ ] Render shows **Deploy live**, and `CRON_KEY`, `EMAIL_API_KEY` and `SERPAPI_KEYS` are set.
- [ ] Run `npm run featured` (server folder) so the homepage is full.
- [ ] Pre-load demo searches on the **live** site: `blue denim jacket men`, `white sneakers`, `kurta set women`, `black oversized t-shirt`.
- [ ] Open **"all stores"** on 2 products you will show (keeps them saved for 24 hours).
- [ ] Demo account: registered, personalise step filled, email verified, logged in.
- [ ] One alert with a target **above** the current price (so the live email is guaranteed).
- [ ] At least 30 searches left on SerpApi.
- [ ] Record a **2-minute backup screen video** of this flow.

## 10 minutes before

- [ ] Open `https://stylescout-twyy.onrender.com/api/health` to wake the server (free tier sleeps).
- [ ] Log in. Open tabs: homepage, saved search, `/profile`, `/alerts`.
- [ ] Terminal ready with the alert-check command (optional).
- [ ] If the internet fails, play the backup video and narrate over it.
