import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript source; Next compiles them.
  transpilePackages: ['@claimsense/shared', '@claimsense/rules'],
};

export default nextConfig;
