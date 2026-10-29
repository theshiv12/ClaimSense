import 'server-only';
import mongoose from 'mongoose';
import { env } from './env';

// Cached across hot reloads and serverless invocations.
const g = globalThis as typeof globalThis & { claimsenseDb?: Promise<typeof mongoose> };

export const connectDb = (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return Promise.resolve(mongoose);
  g.claimsenseDb ??= mongoose
    .connect(env().MONGODB_URI, { dbName: env().MONGODB_DB, serverSelectionTimeoutMS: 10_000 })
    .catch((err: unknown) => {
      g.claimsenseDb = undefined;
      throw err;
    });
  return g.claimsenseDb;
};
