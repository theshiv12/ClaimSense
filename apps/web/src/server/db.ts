import 'server-only';
import mongoose from 'mongoose';
import { mongoUriHint, mongoUriProblem } from '@/lib/mongo-uri';
import { env } from './env';

// Cached across hot reloads and serverless invocations.
const g = globalThis as typeof globalThis & { claimsenseDb?: Promise<typeof mongoose> };

export const connectDb = (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return Promise.resolve(mongoose);
  const problem = mongoUriProblem(env().MONGODB_URI);
  if (problem) {
    // The hint names the mistake, never the value (it holds a password).
    console.error(`[db] ${mongoUriHint(problem)}`);
    return Promise.reject(new Error(`MONGODB_URI ${problem}`));
  }
  g.claimsenseDb ??= mongoose
    .connect(env().MONGODB_URI, { dbName: env().MONGODB_DB, serverSelectionTimeoutMS: 10_000 })
    .catch((err: unknown) => {
      g.claimsenseDb = undefined;
      throw err;
    });
  return g.claimsenseDb;
};
