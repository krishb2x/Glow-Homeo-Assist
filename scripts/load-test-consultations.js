#!/usr/bin/env node
/**
 * Lightweight load smoke for consultation API paths.
 * Usage: API_URL=http://localhost:4000 node scripts/load-test-consultations.js
 */
const base = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const concurrent = Number(process.env.LOAD_CONCURRENT ?? "10");
const rounds = Number(process.env.LOAD_ROUNDS ?? "5");

async function hit(path) {
  const t0 = Date.now();
  const r = await fetch(`${base}${path}`);
  return { ok: r.ok, ms: Date.now() - t0, status: r.status };
}

async function run() {
  const paths = ["/health", "/health/deep"];
  console.log(`Load test ${concurrent}x${rounds} against ${base}`);
  const results = [];
  for (let i = 0; i < rounds; i++) {
    const batch = [];
    for (let j = 0; j < concurrent; j++) {
      batch.push(hit(paths[j % paths.length]));
    }
    results.push(...(await Promise.all(batch)));
  }
  const ok = results.filter((r) => r.ok).length;
  const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  const p95 = [...results].sort((a, b) => a.ms - b.ms)[Math.floor(results.length * 0.95)]?.ms ?? 0;
  console.log({ total: results.length, ok, failed: results.length - ok, avgMs: avg, p95Ms: p95 });
  process.exit(ok === results.length ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
