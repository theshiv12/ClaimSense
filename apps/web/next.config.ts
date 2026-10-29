import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript source; Next compiles them.
  transpilePackages: ['@claimsense/shared', '@claimsense/rules'],
  // Uploads are capped at 4 MB in code (FILE_TOO_LARGE); allow the multipart overhead on top.
  experimental: { serverActions: { bodySizeLimit: '4.2mb' } },
};

export default nextConfig;
