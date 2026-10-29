import { MongoMemoryServer } from 'mongodb-memory-server';

// One in-memory MongoDB for the whole run, thrown away at the end. Each worker uses its own
// database (test/setup.ts) and each test its own users, so nothing is ever cleared.
let server: MongoMemoryServer | undefined;

export async function setup() {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
}

export async function teardown() {
  await server?.stop();
}
