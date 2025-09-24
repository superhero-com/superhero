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
      // Route icon barrel to shared Next-compatible icon wrappers
      "@super/icons": "@super/icons-next",
      "#icons": "@super/icons-next",
      "@super/icons-next": path.resolve(__dirname, "../../src/icons/index-next.tsx"),
    },
  },
  webpack: (config) => {
    // Ensure Sass resolves shared styles from root src/styles
    const sassRule = config.module?.rules?.find((r: any) =>
      typeof r === 'object' && Array.isArray(r.oneOf)
    );
    if (sassRule) {
      for (const rule of sassRule.oneOf) {
        if (Array.isArray(rule.use)) {
          for (const u of rule.use) {
            if (u.loader && u.loader.includes('sass-loader')) {
              u.options = u.options || {};
              u.options.sassOptions = u.options.sassOptions || {};
              const includePaths = u.options.sassOptions.includePaths || [];
              u.options.sassOptions.includePaths = Array.from(new Set([
                ...includePaths,
                path.resolve(__dirname, "../../src/styles"),
              ]));
            }
          }
        }
      }
    }
    return config;
  },
};

export default nextConfig;
