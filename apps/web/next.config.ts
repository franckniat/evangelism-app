import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@moisson/core` est publié en TypeScript source (monorepo) : Next doit le
  // transpiler comme le reste de l'application.
  transpilePackages: ["@moisson/core"],
};

export default nextConfig;
