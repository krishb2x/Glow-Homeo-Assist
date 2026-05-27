import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", "..", ".env") });

const publicApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const monorepoRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Standalone is for Docker (`Dockerfile.web` sets `DOCKER_BUILD=1`). */
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
  /**
   * Docker needs monorepo-root tracing for standalone output.
   * On Vercel, tracing the whole repo can duplicate `next`/`react` and break static /404 generation.
   */
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: monorepoRoot }),
  transpilePackages: ["@homeoassist/print"],
  env: {
    NEXT_PUBLIC_API_URL: publicApi
  },
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
