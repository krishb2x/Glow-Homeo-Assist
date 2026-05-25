import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Monorepo root `.env` (cwd may be `apps/api` or repo root when running vitest).
const rootFromApiCwd = path.join(process.cwd(), "..", "..", ".env");
const rootFromRepoCwd = path.join(process.cwd(), ".env");
const legacyApi = path.join(process.cwd(), "apps", "api", ".env");
if (existsSync(rootFromRepoCwd)) loadEnv({ path: rootFromRepoCwd });
else if (existsSync(rootFromApiCwd)) loadEnv({ path: rootFromApiCwd });
else if (existsSync(legacyApi)) loadEnv({ path: legacyApi });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/__tests__/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/lib/**/*.ts",
        "src/modules/jobs/jobQueue.logic.ts",
        "src/modules/whatsapp/variableResolver.ts",
        "src/modules/whatsapp/webhookHandler.ts"
      ],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**", "src/server.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70
      }
    }
  }
});
