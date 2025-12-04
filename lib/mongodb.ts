import mongoose from 'mongoose';

// Validate critical environment variables on startup
const criticalEnvVars = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const missingCriticalVars = criticalEnvVars.filter((varName) => !process.env[varName]);

if (missingCriticalVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingCriticalVars.join(', ')}. Please define them in .env.local`
  );
}

// Warn about optional but recommended variables
const recommendedEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ENCRYPTION_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASS',
];

const missingRecommendedVars = recommendedEnvVars.filter((varName) => !process.env[varName]);

if (missingRecommendedVars.length > 0 && process.env.NODE_ENV !== 'production') {
  console.warn(
    `Warning: Missing recommended environment variables: ${missingRecommendedVars.join(', ')}. Some features may not work correctly.`
  );
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('Connecting to MongoDB...');
    const startTime = Date.now();

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log(`MongoDB connected in ${Date.now() - startTime}ms`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;
