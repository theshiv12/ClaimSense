import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript source; Next compiles them.
  transpilePackages: ['@claimsense/shared', '@claimsense/rules'],
  // src/proxy.ts forwards /api/* to the API. Uploads are capped at 4 MB by the API (FILE_TOO_LARGE);
  // the proxy buffers a little more so an over-size file reaches it whole and gets that clear error.
  experimental: { proxyClientMaxBodySize: '5mb' },
};

export default nextConfig;
