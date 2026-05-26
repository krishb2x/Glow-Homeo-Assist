#!/usr/bin/env node
/**
 * Pre-deploy gate — run from repo root: node scripts/deploy-preflight.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", ...opts });
  if (r.status !== 0) {
    console.error(`\n✗ Failed: ${label}`);
    process.exit(r.status ?? 1);
  }
  console.log(`✓ ${label}`);
}

console.log("HomeoAssist deploy preflight\n");

run("API lint", "npm", ["run", "lint", "-w", "@homeoassist/api"]);
run("Web lint", "npm", ["run", "lint", "-w", "@homeoassist/web"]);
run("API tests", "npm", ["run", "test:api"]);
run("Web tests", "npm", ["run", "test:web"]);
run("Build API", "npm", ["run", "build", "-w", "@homeoassist/api"]);
run("Build web", "npm", ["run", "build", "-w", "@homeoassist/web"]);
run("Infrastructure validation", "node", ["scripts/infra-validation.mjs"]);

console.log("\n✓ Deploy preflight passed — safe to build Docker images and deploy.\n");
