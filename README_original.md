# StyleScout

Y2K fashion comparison prototype for a college web-development project. The frontend is immediately usable with a seeded demonstration catalogue; the Express/MongoDB backend provides the foundation for authentication and persistent wishlist CRUD.

## Run
1. Install Node.js 20+ and MongoDB Community Server.
2. From the project root: `npm install` then `npm run install:all`.
3. Copy `server/.env.example` to `server/.env` and change `JWT_SECRET`.
4. Start MongoDB.
5. Run `npm run dev`.
6. Open the Vite URL (normally http://localhost:5173).

## Current build
- Pure Y2K responsive UI; no liquid-chrome theme.
- Women, men, kids and unisex clothing catalogue.
- Text search, audience/store filters and sorting.
- Clothing-oriented image upload fallback validation.
- Best Deal Score and discount badges.
- Wishlist and comparison interactions in the demo UI.
- Merchant handoff links to Amazon, Myntra, Ajio, Flipkart, H&M and Zara.
- Location permission control and country/currency UI.
- Discount notification UI.
- Demo CAPTCHA UI plus server CAPTCHA requirement.
- Express routes, JWT/bcrypt auth, MongoDB models, validation, rate limiting and protected wishlist CRUD.

## Important demo-data note
Retailer product records are demonstration data. StyleScout does not claim those records are live retailer inventory or prices. Merchant buttons hand off to the retailer websites. Real provider APIs can replace the demo provider later.

## Image search architecture
The current no-key fallback uses safe local/demo matching rather than pretending to run a live vision model. A production vision provider should classify the uploaded image as clothing/non-clothing and return category/colour/style attributes; non-clothing must return `ITEM NOT FOUND`.

## Next implementation layer
Persist the frontend catalogue from MongoDB, add Review/SearchHistory/PriceAlert models and CRUD, admin CRUD, real geo-to-country/currency resolution, and an optional vision API provider while retaining the offline demo fallback.
