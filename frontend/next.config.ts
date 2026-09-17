import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_SERVICE_URL || "http://localhost:5001";

const nextConfig: NextConfig = {
  // lanjut.id is served at the domain root, no subpath needed
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
