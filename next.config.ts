import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Evita que o Next use lockfile fora do projeto (C:\Users\edson) como workspace root.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
