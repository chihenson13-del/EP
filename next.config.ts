import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    serverActions: {
      // Image uploads are sent as base64 data URLs through server actions, which inflates
      // their size by ~33% — this leaves headroom for the 5MB image cap in ImageUpload.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
