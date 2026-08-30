import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@harvest/core` est publié en TypeScript source (monorepo) : Next doit le
  // transpiler comme le reste de l'application.
  transpilePackages: ["@harvest/core"],
};

export default nextConfig;
