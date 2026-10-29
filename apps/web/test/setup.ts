import mongoose from 'mongoose';
import { afterAll, beforeEach, vi } from 'vitest';
import { jar, testIp } from './cookie-jar';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(jar),
  headers: () => Promise.resolve(new Headers({ 'x-forwarded-for': testIp.value })),
}));

process.env.MONGODB_DB = `claimsense_test_${process.env.VITEST_POOL_ID ?? '0'}`;
process.env.GEMINI_API_KEY ??= 'test-key-not-real';

beforeEach(() => {
  jar.clear();
  testIp.value = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
});

afterAll(async () => {
  await mongoose.disconnect();
});
