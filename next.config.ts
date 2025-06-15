import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  serverExternalPackages: [],
  images: {
    domains: ["img.youtube.com"],
    // Cloudflare Pages用の画像ローダー設定
    loader: "custom",
    loaderFile: "./lib/cloudflare-image-loader.ts",
  },
  // Edge Runtime対応設定
  experimental: {},
};

export default nextConfig;
