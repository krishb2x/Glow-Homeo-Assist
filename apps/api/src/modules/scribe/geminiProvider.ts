import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Gemini provider for AI Scribe
// ---------------------------------------------------------------------------

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. AI Scribe is unavailable.");
  }
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return _genAI;
}

export type GeminiAnalysisOptions = {
  maxOutputTokens?: number;
  temperature?: number;
};

/**
 * Sends a prompt to Gemini and returns the raw text response.
 *
 * Uses JSON response mode so the model is constrained to valid JSON output.
 * Throws on API errors, timeouts, or empty responses.
 */
export async function analyzeWithGemini(
  prompt: string,
  options: GeminiAnalysisOptions = {}
): Promise<{ text: string; tokensUsed: { input: number; output: number } }> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens ?? env.SCRIBE_MAX_OUTPUT_TOKENS,
      temperature: options.temperature ?? 0.3,
      responseMimeType: "application/json"
    }
  });

  const t0 = Date.now();

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error("Gemini returned an empty response.");
    }

    const usage = response.usageMetadata;
    const tokensUsed = {
      input: usage?.promptTokenCount ?? 0,
      output: usage?.candidatesTokenCount ?? 0
    };

    const elapsed = Date.now() - t0;
    logger.info("gemini_analysis_complete", {
      model: env.GEMINI_MODEL,
      elapsed_ms: elapsed,
      tokens_in: tokensUsed.input,
      tokens_out: tokensUsed.output
    });

    return { text, tokensUsed };
  } catch (error) {
    const elapsed = Date.now() - t0;
    const message = error instanceof Error ? error.message : String(error);

    // Classify error for scribe_jobs.error_code
    let errorCode = "GEMINI_ERROR";
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      errorCode = "RATE_LIMITED";
    } else if (message.includes("timeout") || message.includes("DEADLINE_EXCEEDED")) {
      errorCode = "TIMEOUT";
    } else if (message.includes("API key")) {
      errorCode = "AUTH_ERROR";
    }

    logger.error("gemini_analysis_failed", {
      model: env.GEMINI_MODEL,
      elapsed_ms: elapsed,
      error_code: errorCode,
      message
    });

    throw Object.assign(new Error(message), { code: errorCode });
  }
}

/** Check if Gemini is configured and available. */
export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
