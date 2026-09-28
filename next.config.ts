import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["embedded-postgres"],
  outputFileTracingExcludes: {
    "*": ["./node_modules/@embedded-postgres/**", "./node_modules/embedded-postgres/**"],
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
