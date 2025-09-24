import type { NextConfig } from "next";
import path from "path";

const isCI = process.env.CI === "true" || process.env.NEXT_STRICT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // In CI, fail the build on TS errors; locally we keep it lenient while migrating
    ignoreBuildErrors: !isCI,
  },
  eslint: {
    // In CI, run ESLint; during local Next build we skip for speed
    ignoreDuringBuilds: !isCI,
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
      // Route icon barrel to shared Next-compatible icon wrappers to avoid React-SVG issues
      "@super/icons": path.resolve(__dirname, "../../src/icons-next.tsx"),
      "#icons": path.resolve(__dirname, "../../src/icons-next.tsx"),
    },
  },
};

export default nextConfig;
