import path from "node:path";
import { defineConfig } from "vitest/config";
import { loadMonorepoEnv } from "./src/lib/loadMonorepoEnv";

loadMonorepoEnv(path.join(__dirname, "src"));

/** Integration tests: load full Express app without binding a port or running schema bootstrap. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.int.test.ts"],
    exclude: [],
    env: {
      VITEST: "true"
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false
  }
});
