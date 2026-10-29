// Starts a throw-away in-memory MongoDB for local smoke runs and e2e tests; prints its URI.
// Nothing is persisted: the data is gone when this process exits.
import { MongoMemoryServer } from 'mongodb-memory-server';

const server = await MongoMemoryServer.create({ instance: { port: Number(process.env.MEMORY_DB_PORT ?? 27_999) } });
console.log(`memory-db ready ${server.getUri()}`);
const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
