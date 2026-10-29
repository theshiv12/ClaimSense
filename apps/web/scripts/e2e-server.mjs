// e2e: a throw-away in-memory MongoDB, the Express API, and `next start` in front of it (ADR-009),
// so CI needs no secrets. Gemini is never called (the e2e journeys use samples and manual facts only).
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = process.env.E2E_PORT ?? '3200';
const apiPort = String(Number(port) + 1000);
const proxySecret = randomBytes(24).toString('hex'); // shared by the web proxy and the API for this run only
const db = await MongoMemoryServer.create();

const api = spawn('pnpm', ['--filter', '@claimsense/api', 'exec', 'tsx', 'src/server.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MONGODB_URI: db.getUri(),
    MONGODB_DB: 'claimsense_e2e',
    GEMINI_API_KEY: 'e2e-not-a-real-key',
    PORT: apiPort,
    WEB_ORIGIN: `http://localhost:${port}`,
    PROXY_SECRET: proxySecret,
  },
});
const next = spawn('pnpm', ['exec', 'next', 'start', '-p', port], {
  stdio: 'inherit',
  env: { ...process.env, API_ORIGIN: `http://localhost:${apiPort}`, PROXY_SECRET: proxySecret },
});

// Stops everything once, and exits with the code that caused it (a crashed child fails the run).
let stopping = false;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  next.kill('SIGTERM');
  api.kill('SIGTERM');
  await db.stop();
  process.exit(code);
};
process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));
for (const child of [api, next]) child.on('exit', (code) => void stop(code ?? 1));
