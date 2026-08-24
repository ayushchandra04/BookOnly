// Standalone sweep scheduler for environments with a persistent Node process
// (local dev, Render, Railway). On Vercel, use vercel.json's cron config instead —
// serverless functions can't run a long-lived setInterval/node-cron loop.
//
// Usage: node scripts/cron.js  (reads APP_BASE_URL and CRON_SECRET from the environment)
import cron from "node-cron";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

async function sweep() {
  try {
    const res = await fetch(`${APP_BASE_URL}/api/cron/sweep`, {
      method: "POST",
      headers: CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {},
    });
    const body = await res.json();
    console.log(`[cron] sweep ${res.status}:`, body);
  } catch (err) {
    console.error("[cron] sweep failed:", err.message);
  }
}

cron.schedule("* * * * *", sweep);
console.log("[cron] scheduled seat-hold / waitlist-offer sweep every 1 minute");
sweep();
