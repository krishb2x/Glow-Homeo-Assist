export type IntakeIntent = "walkthrough" | "trial";

export type ParsedIntake =
  | {
      ok: true;
      intent: IntakeIntent;
      name: string;
      email: string;
      phone: string;
      city: string;
      /** Optional practice / clinic hint (stored in message when present). */
      practice: string | null;
    }
  | { ok: false; status: number; error: string };

export type MarketingLeadPayload = {
  name: string;
  email: string;
  phone: string;
  clinicName: string;
  city: string;
  message: string | null;
  intent: IntakeIntent;
};

const CLINIC_NAME_PREFIX = "GlowHomeo Assist — ";
/** Must match Express `marketingLeadBody` message max (optional field). */
const MARKETING_LEAD_MESSAGE_MAX = 2000;

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function validPhone(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15;
}

type Body = {
  intent?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  city?: unknown;
  practice?: unknown;
};

export function backendBaseFromEnv(): string {
  const b = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (b && b.length > 0) return b.replace(/\/$/, "");
  return "http://127.0.0.1:4000";
}

export function parseIntakeBody(raw: unknown): ParsedIntake {
  const b = raw as Body;
  const intentRaw = String(b.intent ?? "").trim().toLowerCase();
  const intent =
    intentRaw === "trial" ? "trial" : intentRaw === "walkthrough" ? "walkthrough" : null;
  if (!intent) {
    return { ok: false, status: 400, error: "Invalid intent." };
  }

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").trim();
  const city = String(b.city ?? "").trim();
  const practiceRaw = typeof b.practice === "string" ? b.practice.trim() : "";
  if (practiceRaw.length > 200) {
    return { ok: false, status: 400, error: "Practice name must be 200 characters or less." };
  }
  const practice = practiceRaw.length > 0 ? practiceRaw : null;

  if (!name || name.length > 200) {
    return { ok: false, status: 400, error: "Full name is required." };
  }
  if (!email || !validEmail(email) || email.length > 320) {
    return { ok: false, status: 400, error: "A valid email is required." };
  }
  if (!phone || !validPhone(phone)) {
    return {
      ok: false,
      status: 400,
      error: "A valid mobile number is required (10–15 digits)."
    };
  }
  if (!city || city.length > 120) {
    return { ok: false, status: 400, error: "City is required." };
  }

  return { ok: true, intent, name, email, phone, city, practice };
}

export function buildMarketingLeadPayload(parsed: Extract<ParsedIntake, { ok: true }>): MarketingLeadPayload {
  const clinicLabel = parsed.intent === "walkthrough" ? "20-minute walkthrough" : "90-day guided trial";
  const rawMessage = parsed.practice ? `Practice: ${parsed.practice}` : "";
  const truncTail = "\n…[truncated]";
  const message =
    rawMessage.length === 0
      ? null
      : rawMessage.length > MARKETING_LEAD_MESSAGE_MAX
        ? `${rawMessage.slice(0, MARKETING_LEAD_MESSAGE_MAX - truncTail.length)}${truncTail}`
        : rawMessage;
  return {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    clinicName: `${CLINIC_NAME_PREFIX}${clinicLabel}`,
    city: parsed.city,
    message,
    intent: parsed.intent
  };
}

export type ForwardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * POST body to Express /public/marketing-lead. Pass fetchFn in tests to mock the backend.
 */
export async function forwardToMarketingLead(
  payload: MarketingLeadPayload,
  opts?: { baseUrl?: string; fetchFn?: typeof fetch }
): Promise<ForwardResult> {
  const base = (opts?.baseUrl ?? backendBaseFromEnv()).replace(/\/$/, "");
  const fetchFn = opts?.fetchFn ?? fetch;

  try {
    const res = await fetchFn(`${base}/public/marketing-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        clinicName: payload.clinicName,
        city: payload.city,
        message: payload.message ?? undefined,
        intent: payload.intent
      })
    });
    const text = await res.text();
    let parsed: { success?: boolean; error?: string; data?: unknown } | null = null;
    try {
      parsed = JSON.parse(text) as { success?: boolean; error?: string; data?: unknown };
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
        error: parsed?.error ?? "Unable to submit. Please try again later."
      };
    }
    if (parsed && parsed.success === false) {
      return {
        ok: false,
        status: 400,
        error: parsed.error ?? "Request rejected."
      };
    }
    if (parsed && parsed.success === true) {
      return { ok: true };
    }
    return { ok: false, status: 502, error: "Unexpected response from server." };
  } catch {
    return { ok: false, status: 502, error: "Service temporarily unavailable." };
  }
}
