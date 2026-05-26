#!/usr/bin/env node
/**
 * Infrastructure validation — run from repo root: node scripts/infra-validation.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, "..");

function parseEnvContent(raw) {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envPath = path.join(root, ".env");
const fileEnv = fs.existsSync(envPath) ? parseEnvContent(fs.readFileSync(envPath, "utf8")) : {};
const env = { ...fileEnv, ...process.env };
const API = (env.API_URL || env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

const report = { ts: new Date().toISOString(), sections: {}, summary: {} };

function checkEnv() {
  const keys = [
    "DAILY_API_KEY", "DAILY_DOMAIN", "DAILY_WEBHOOK_SECRET",
    "META_APP_ID", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_TOKEN_ENCRYPTION_KEY",
    "PLATFORM_WHATSAPP_PHONE_NUMBER_ID", "PLATFORM_WHATSAPP_ACCESS_TOKEN",
    "RESEND_API_KEY", "NOTIFICATION_FROM_EMAIL", "NOTIFICATION_REPLY_TO_EMAIL", "RESEND_WEBHOOK_SECRET",
    "APP_PUBLIC_URL", "JWT_SECRET", "CORS_ORIGIN", "SUPABASE_URL"
  ];
  const status = {};
  for (const k of keys) {
    status[k] = { set: Boolean(env[k]?.trim()), len: env[k]?.trim()?.length ?? 0 };
  }
  report.sections.environment = { envPath, exists: fs.existsSync(envPath), status, mockSend: env.NOTIFICATION_MOCK_SEND === "true" };
}

async function checkDb() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    report.sections.database = { ok: false, error: "Supabase env missing" };
    return;
  }
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const tables = ["video_sessions", "consultation_events", "whatsapp_connections", "notification_jobs"];
  const tablesOut = {};
  for (const t of tables) {
    const { error, count } = await admin.from(t).select("*", { count: "exact", head: true });
    tablesOut[t] = error ? { ok: false, error: error.message } : { ok: true, count };
  }
  const { error: rpcErr } = await admin.rpc("claim_notification_jobs", {
    p_worker_id: "validation", p_limit: 1, p_topics: null
  });
  report.sections.database = { tables: tablesOut, claimRpc: !rpcErr, rpcError: rpcErr?.message ?? null };
}

async function checkDaily() {
  const key = env.DAILY_API_KEY?.trim();
  if (!key) {
    report.sections.daily = { ok: false, error: "DAILY_API_KEY missing from .env" };
    return;
  }
  try {
    const r = await fetch("https://api.daily.co/v1/", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000)
    });
    report.sections.daily = { ok: r.ok, status: r.status };
  } catch (e) {
    report.sections.daily = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkResend() {
  const mock = env.NOTIFICATION_MOCK_SEND === "true";
  const key = env.RESEND_API_KEY?.trim();
  if (mock) {
    report.sections.resend = { ok: true, mock: true, detail: "NOTIFICATION_MOCK_SEND=true" };
    return;
  }
  if (!key) {
    report.sections.resend = { ok: false, error: "RESEND_API_KEY missing" };
    return;
  }
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000)
    });
    report.sections.resend = {
      ok: r.ok,
      status: r.status,
      from: env.NOTIFICATION_FROM_EMAIL?.trim() || null,
      webhookSecret: Boolean(env.RESEND_WEBHOOK_SECRET?.trim())
    };
  } catch (e) {
    report.sections.resend = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkApi() {
  try {
    const h = await fetch(`${API}/health/deep`, { signal: AbortSignal.timeout(10000) });
    report.sections.api = { ok: h.ok, status: h.status, body: await h.json() };
  } catch (e) {
    report.sections.api = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  checkEnv();
  await checkDb();
  await checkDaily();
  await checkResend();
  await checkApi();
  const blockers = [];
  if (!report.sections.environment?.status?.DAILY_API_KEY?.set) blockers.push("DAILY_API_KEY not in .env file");
  if (!report.sections.database?.claimRpc) blockers.push("claim_notification_jobs RPC");
  if (!report.sections.api?.ok) blockers.push("API /health/deep unreachable");
  report.summary = { blockers, verdict: blockers.length ? "not ready" : "ready for supervised beta" };
  console.log(JSON.stringify(report, null, 2));
  process.exit(blockers.length ? 1 : 0);
}

main();
