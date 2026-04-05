import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the workspace root so Next's file tracer doesn't climb into
  // C:\Users\<user>\package.json and rebase the standalone output.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
