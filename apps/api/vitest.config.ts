import path from "node:path";
import { defineConfig } from "vitest/config";
import { loadMonorepoEnv } from "./src/lib/loadMonorepoEnv";

loadMonorepoEnv(path.join(__dirname, "src"));

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
