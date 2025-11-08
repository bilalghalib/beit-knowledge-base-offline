import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Run as Next.js server in Electron (not static export)
  // This allows API routes to work
  output: 'standalone',
};

// Plugin will automatically look for ./i18n/request.ts
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
