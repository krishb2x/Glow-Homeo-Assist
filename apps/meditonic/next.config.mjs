import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", "..", ".env") });

const monorepoRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: monorepoRoot }),
  env: {
    NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID:
      process.env.MEDITONIC_RAZORPAY_KEY_ID || "",
    NEXT_PUBLIC_SITE_URL:
      process.env.MEDITONIC_SITE_URL || "http://localhost:3001",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  serverExternalPackages: ["muhammara"],
};

export default nextConfig;
