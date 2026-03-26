import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large base64 image payloads in both API routes and server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Increase body size limit for API routes (default is 4MB — too small for mobile camera images)
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: "50mb",
  },
};

export default nextConfig;
