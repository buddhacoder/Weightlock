import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/webhooks/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
