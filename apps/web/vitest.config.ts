import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// UI tests only: the server and its database tests live in apps/api (ADR-009).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/': here('./src/'),
      'server-only': here('./test/empty.ts'), // the real one throws outside React Server Components
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/components/**/*.tsx', 'src/lib/**/*.ts'],
    },
  },
});
