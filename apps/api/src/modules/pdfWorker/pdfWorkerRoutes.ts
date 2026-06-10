import { Router } from "express";
import { z } from "zod";
import { jsonSuccess, jsonError } from "../../lib/apiEnvelope";
import { logger } from "../../lib/logger";
import { processBackgroundDelivery } from "./pdfWorkerService";

import { env } from "../../config/env";

export const pdfWorkerRoutes = Router();

const payloadSchema = z.object({
  orderId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional().default(""),
  digitalItems: z.array(z.any()),
  physicalItems: z.array(z.any()),
  date: z.string().optional().default(new Date().toISOString()),
});

pdfWorkerRoutes.post("/pdf-delivery", async (req, res) => {
  const secret = req.headers["x-worker-secret"];
  const expectedSecret = env.WORKER_SECRET;
  
  if (!expectedSecret) {
    logger.error("[PDF Worker] WORKER_SECRET is not set on the server.");
    return jsonError(res, 500, "Server misconfiguration", { code: "CONFIG_ERROR" });
  }

  if (secret !== expectedSecret) {
    return jsonError(res, 401, "Unauthorized", { code: "UNAUTHORIZED" });
  }

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return jsonError(res, 400, "Invalid payload", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  // 1. Respond immediately so the caller (Vercel) doesn't wait
  jsonSuccess(res, 202, { message: "Accepted for background processing" });

  // 2. Guarantee the HTTP response is flushed to the OS before starting heavy CPU tasks
  setTimeout(() => {
    processBackgroundDelivery(parsed.data).catch(err => {
      logger.error(`[PDF Worker] Uncaught error in background process: ${err.message}`);
    });
  }, 1000);
});
