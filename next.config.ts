import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
