import { logger } from "./logger";

export type SpanLabels = Record<string, string | number | boolean | undefined>;

/**
 * Lightweight request/operation timing — OpenTelemetry-compatible shape for future export.
 */
export function startSpan(name: string, labels?: SpanLabels): { end: (extra?: SpanLabels) => void } {
  const t0 = performance.now();
  return {
    end(extra?: SpanLabels) {
      const ms = Math.round(performance.now() - t0);
      logger.info("span_complete", { span: name, durationMs: ms, ...labels, ...extra });
    }
  };
}

export function recordQueueMetric(
  topic: string,
  metric: "claimed" | "processed" | "failed" | "dead_letter",
  count: number
): void {
  logger.info("queue_metric", { topic, metric, count });
}

export function recordBroadcastMetric(
  broadcastId: string,
  metric: "sent" | "delivered" | "read" | "failed",
  delta = 1
): void {
  logger.info("broadcast_metric", { broadcastId, metric, delta });
}
