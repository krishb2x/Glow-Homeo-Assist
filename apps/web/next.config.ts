import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", "..", ".env") });

const publicApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Ensure client bundles see NEXT_PUBLIC_API_URL (monorepo root .env is loaded above). */
  env: {
    NEXT_PUBLIC_API_URL: publicApi
  }
};

export default nextConfig;
