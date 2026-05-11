import type { NextConfig } from "next";

const config: NextConfig = {
  // Standalone output bundles a minimal runnable server.js + only the deps it
  // actually needs, so we can run the app without shipping node_modules.
  output: "standalone",
  outputFileTracingRoot: __dirname,
  // Rewrite browser /api/* requests to the actual API host. Read at runtime
  // by the Next server, so we can move sandboxes without rebuilding.
  async rewrites() {
    const target = process.env.API_URL || "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/health", destination: `${target}/health` },
    ];
  },
};

export default config;
