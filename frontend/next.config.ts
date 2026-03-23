import type { NextConfig } from "next";

const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
