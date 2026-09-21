import type { NextConfig } from "next";

// Baseline browser protections. Framing is limited to the site itself (the owner Preview uses a same-origin iframe).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
]

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  experimental: {
    serverActions: {
      // Image uploads are sent as base64 data URLs through server actions, which inflates
      // their size by ~33% — this leaves headroom for the 5MB image cap in ImageUpload.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
