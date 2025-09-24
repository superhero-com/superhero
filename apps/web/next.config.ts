import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [
      "react",
      "react-dom",
      "@tanstack/react-query",
    ],
  },
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "../../src"),
      "@super": path.resolve(__dirname, "../../src"),
    },
  },
};

export default nextConfig;
