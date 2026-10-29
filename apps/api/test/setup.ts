import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeEach } from 'vitest';
import { jar, testIp } from './cookie-jar';

// One database per test file: files in the same worker run in fresh processes, and ObjectIds made in the same
// second by different processes do not sort by time, so a shared database lets one file's rows leak into another's.
process.env.MONGODB_DB = `claimsense_test_${process.env.VITEST_POOL_ID ?? '0'}_${randomUUID().slice(0, 8)}`;
process.env.GEMINI_API_KEY = 'test-key-not-real'; // always: a real key in the shell must never reach a test
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.TRUST_PROXY = 'true';

beforeEach(() => {
  jar.clear();
  testIp.value = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
});

afterAll(async () => {
  await mongoose.disconnect();
});
