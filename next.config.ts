import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  serverExternalPackages: [],
  images: {
    domains: ["img.youtube.com"],
  },
};

export default nextConfig;
