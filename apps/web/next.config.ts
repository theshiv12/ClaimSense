import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript source; Next compiles them.
  transpilePackages: ['@claimsense/shared', '@claimsense/rules'],
  // src/proxy.ts forwards /api/* to the API. Uploads are capped at 4 MB by the API (FILE_TOO_LARGE);
  // the proxy buffers a little more so an over-size file reaches it whole and gets that clear error.
  // Next drops a proxied request after 30 s by default, but a document read can take up to two Gemini calls of
  // 60 s each (primary, then fallback: apps/api/src/integrations/gemini.ts), so allow 150 s.
  experimental: { proxyClientMaxBodySize: '5mb', proxyTimeout: 150_000 },
};

export default nextConfig;
