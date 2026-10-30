import { defineConfig } from 'tsup';

// One ESM bundle for any Node 24 host. Workspace packages ship TypeScript source, so they are bundled;
// npm dependencies (including native @node-rs/argon2) stay external and are installed on the host.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@claimsense\//],
});
