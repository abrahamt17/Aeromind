import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Database drivers load native runtime files, so they are not bundled.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector", "postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
