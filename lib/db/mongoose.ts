import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

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
  cached.conn = await cached.promise;
  return cached.conn;
}

export function isDbConfigured() {
  return Boolean(MONGODB_URI);
}
