import mongoose from 'mongoose';
import { afterAll, beforeEach, vi } from 'vitest';
import { jar } from './cookie-jar';

vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(jar) }));

process.env.MONGODB_DB = `claimsense_test_${process.env.VITEST_POOL_ID ?? '0'}`;
process.env.GEMINI_API_KEY ??= 'test-key-not-real';

beforeEach(() => jar.clear());

afterAll(async () => {
  await mongoose.disconnect();
});
