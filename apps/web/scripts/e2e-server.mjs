// e2e web server: a throw-away in-memory MongoDB plus `next start`, so CI needs no secrets.
// Gemini is never called (the e2e journeys use samples and manual facts only).
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = process.env.E2E_PORT ?? '3200';
const db = await MongoMemoryServer.create();
const next = spawn('pnpm', ['exec', 'next', 'start', '-p', port], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MONGODB_URI: db.getUri(),
    MONGODB_DB: 'claimsense_e2e',
    GEMINI_API_KEY: 'e2e-not-a-real-key',
  },
});

const stop = async () => {
  next.kill('SIGTERM');
  await db.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
next.on('exit', (code) => void db.stop().then(() => process.exit(code ?? 0)));
