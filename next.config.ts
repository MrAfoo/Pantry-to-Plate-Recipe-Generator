import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large base64 image payloads in API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
