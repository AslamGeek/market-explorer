import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_RUNTIME_BUILD === "1" ? ".next-standard" : ".next",
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
};

export default nextConfig;
