import crypto from 'crypto';
import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import SearchCache from '../models/SearchCache.js';
import User from '../models/User.js';
import { normalise, searchProducts } from './shopping.js';
import { sendPriceAlertEmail } from '../utils/mailer.js';

const HOUR = 60 * 60 * 1000;
const CACHE_HOURS = () => Number(process.env.SEARCH_CACHE_HOURS) || 12;
const CACHE_FRESH_MS = () => CACHE_HOURS() * HOUR;
const FRESH_SEARCH_LIMIT = 10;
const CLAIM_LEASE_MS = 15 * 60 * 1000;

const usableCache = (entry, now) => entry && now - new Date(entry.fetchedAt).getTime() < CACHE_FRESH_MS();

async function sendIfEligible(alert, oldPrice, price, counters) {
  const user = await User.findById(alert.user).select('name email passport.priceAlertEmails').lean();
  if (!user?.email) return;
  if (user.passport?.priceAlertEmails === false) return; // the user turned price-alert emails off in their Style Passport

  const now = new Date();
  const claimId = crypto.randomUUID();
  const claimed = await Alert.findOneAndUpdate({
    _id: alert._id,
    user: alert.user,
    active: true,
    targetPrice: { $gte: price },
    $and: [
      { $or: [{ notifiedAt: { $exists: false } }, { notifiedAt: null }, { notifiedAt: { $lte: new Date(now.getTime() - 24 * HOUR) } }] },
      { $or: [{ notificationClaimedAt: { $exists: false } }, { notificationClaimedAt: null }, { notificationClaimedAt: { $lte: new Date(now.getTime() - CLAIM_LEASE_MS) } }] },
    ],
  }, { $set: { notificationClaim: claimId, notificationClaimedAt: now } }, { new: true }).select('+notificationClaim');

  if (!claimed) return;
  try {
    await sendPriceAlertEmail(user, { ...alert, lastPrice: oldPrice ?? price }, price);
  } catch (error) {
    await Alert.updateOne({ _id: alert._id, notificationClaim: claimId }, {
      $unset: { notificationClaim: 1, notificationClaimedAt: 1 },
    });
    counters.notificationErrors += 1;
    console.warn('Price alert email failed:', error.message);
    return;
  }

  try {
    const finalized = await Alert.updateOne({ _id: alert._id, notificationClaim: claimId }, {
      $set: { notifiedAt: new Date() },
      $unset: { notificationClaim: 1, notificationClaimedAt: 1 },
    });
    if (finalized.matchedCount) counters.notificationsSent += 1;
  } catch (error) {
    counters.notificationErrors += 1;
    // Keep the claim lease if the email went out but its success timestamp failed.
    console.warn('Price alert was emailed but its cooldown could not be recorded:', error.message);
  }
}

export async function runAlertCheck() {
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB must be connected to run alert checks.');

  const alerts = await Alert.find({ active: true }).lean();
  const counters = {
    activeAlerts: alerts.length,
    queriesProcessed: 0,
    freshSearches: 0,
    skippedUncachedQueries: 0,
    matched: 0,
    missing: 0,
    notificationsSent: 0,
    notificationErrors: 0,
    searchErrors: 0,
  };
  if (!alerts.length) return counters;

  const groups = new Map();
  for (const alert of alerts) {
    const query = normalise(alert.query);
    if (!query) continue;
    if (!groups.has(query)) groups.set(query, []);
    groups.get(query).push(alert);
  }

  const queries = [...groups.keys()];
  const entries = await SearchCache.find({ key: { $in: queries.map((query) => `text:${query}`) } }).lean();
  const cacheByKey = new Map(entries.map((entry) => [entry.key, entry]));

  for (const [query, group] of groups) {
    const cached = cacheByKey.get(`text:${query}`);
    let results;
    if (usableCache(cached, Date.now())) {
      // Use the known-good cache document directly. This keeps cached queries
      // free and avoids a cache expiry race triggering an uncapped fresh call.
      results = cached.results;
    } else {
      if (counters.freshSearches >= FRESH_SEARCH_LIMIT) {
        counters.skippedUncachedQueries += 1;
        continue;
      }
      // Reserve the slot before calling the provider. A provider error may still
      // have consumed its search, so failed calls count conservatively.
      counters.freshSearches += 1;
      try {
        const response = await searchProducts(query);
        if (response.cached) counters.freshSearches -= 1;
        results = response.results;
      } catch (error) {
        counters.searchErrors += 1;
        console.warn(`Price alert search failed for a query: ${error.message}`);
        continue;
      }
    }
    counters.queriesProcessed += 1;

    const byProductKey = new Map((Array.isArray(results) ? results : []).map((product) => [String(product.id), product]));
    for (const alert of group) {
      const product = byProductKey.get(alert.productKey);
      const now = new Date();
      if (!product || !Number.isFinite(Number(product.price))) {
        await Alert.updateOne({ _id: alert._id }, { $set: { lastCheckedAt: now } });
        counters.missing += 1;
        continue;
      }

      const price = Number(product.price);
      await Alert.updateOne({ _id: alert._id }, { $set: { lastPrice: price, lastCheckedAt: now } });
      counters.matched += 1;
      if (price <= Number(alert.targetPrice)) await sendIfEligible(alert, alert.lastPrice, price, counters);
    }
  }
  return counters;
}
