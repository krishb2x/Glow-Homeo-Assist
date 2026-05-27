import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", "..", ".env") });

const publicApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  /** Trace deps from monorepo root (workspace packages + hoisted node_modules). */
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@homeoassist/print"],
  /** Ensure client bundles see NEXT_PUBLIC_API_URL (monorepo root .env is loaded above). */
  env: {
    NEXT_PUBLIC_API_URL: publicApi
  },
  /** Smaller client bundles when importing many icons from the barrel file. */
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
