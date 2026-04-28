/**
 * Minimal structured logger (JSON lines) for app/runtime code. Use for routes, WSS, jobs.
 * CLI scripts may use process.stderr / console. No secrets or full request bodies at info level.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function out(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    service: "homeosync-api",
    ...meta
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.LOG_LEVEL === "debug") out("debug", msg, meta);
  },
  info: (msg: string, meta?: Record<string, unknown>) => out("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => out("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => out("error", msg, meta)
};
