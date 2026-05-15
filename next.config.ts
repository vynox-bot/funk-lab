import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // Allow Cloudflare R2 public bucket URLs
      // Pattern: https://pub-xxxx.r2.dev/**
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      // If using a custom domain for R2, add it here:
      // { protocol: "https", hostname: "cdn.yourdomain.com" },
    ],
  },
};

export default nextConfig;
