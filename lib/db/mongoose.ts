import mongoose from "mongoose";
import type { IndexReport } from "./indexes";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexes: Promise<IndexReport> | null;
}

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null, indexes: null });

/** Once per instance: makes the database's indexes follow the schemas, however they drifted. */
export function checkIndexes(): Promise<IndexReport> {
  return (cached.indexes ??= import("./indexes")
    .then(({ repairIndexes }) => repairIndexes())
    .catch((err) => {
      console.error("db:indexes", err);
      return { repaired: [], failed: ["all"] };
    }));
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env.local before using database routes."
    );
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Serverless tuning: keep the pool small and fail fast instead of
      // hanging on unreachable clusters.
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      // Skip auto-discovery on every cold start; we only have one connection.
      maxIdleTimeMS: 30_000,
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Keeping a failed attempt would stop this instance ever reconnecting.
    cached.promise = null;
    throw err;
  }
  // Not awaited: nobody's request should wait for it.
  void checkIndexes();
  return cached.conn;
}

export function isDbConfigured() {
  return Boolean(MONGODB_URI);
}
