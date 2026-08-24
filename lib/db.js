import mongoose from "mongoose";

// Reused across hot-reloads / route handler invocations in dev so we don't
// open a new connection (and blow past Atlas free-tier connection limits)
// on every request.
const cache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB() {
  if (cache.conn) return cache.conn;

  // Read at call-time, not module load-time: callers (e.g. scripts that spin
  // up a temporary test database) may set this after the module first loads.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and fill in a MongoDB connection string (must be a replica set, e.g. Atlas free tier, so transactions work)."
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
