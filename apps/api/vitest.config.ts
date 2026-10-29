import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/server.ts', 'src/**/*.test.ts'] },
  },
});
