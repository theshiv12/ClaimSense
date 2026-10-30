import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './core/env';

const server = createApp().listen(env().PORT, () => console.info(`[api] listening on :${env().PORT}`));

const stop = () => {
  server.close(() => void mongoose.disconnect().finally(() => process.exit(0)));
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
