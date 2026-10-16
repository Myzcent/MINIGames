import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ['10.200.54.200', '10.200.54.200:3030', 'localhost:3030'],
};

export default nextConfig;
