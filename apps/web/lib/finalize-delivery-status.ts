export type FinalizeDeliveryStatus = {
  consultationId: string;
  finalizedAt: string;
  pdfReady: boolean;
  whatsapp: "sent" | "failed" | "skipped" | "queued" | null;
  whatsappDetail?: string | null;
  email: "sent" | "failed" | "skipped" | "queued" | null;
  emailDetail?: string | null;
};

const KEY = "ha_finalize_delivery";

export function saveFinalizeDeliveryStatus(status: FinalizeDeliveryStatus): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, FinalizeDeliveryStatus>) : {};
    map[status.consultationId] = status;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export function loadFinalizeDeliveryStatus(consultationId: string): FinalizeDeliveryStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, FinalizeDeliveryStatus>;
    return map[consultationId] ?? null;
  } catch {
    return null;
  }
}

export function formatDeliveryStatusMessage(status: FinalizeDeliveryStatus): string {
  const parts: string[] = ["Prescription saved."];
  if (status.whatsapp === "sent") parts.push("WhatsApp sent.");
  else if (status.whatsapp === "queued") parts.push("WhatsApp queued — will send shortly.");
  else if (status.whatsapp === "failed") parts.push("WhatsApp failed — retry from patient chart.");
  else if (status.whatsapp === "skipped") parts.push(status.whatsappDetail ?? "WhatsApp skipped.");
  if (status.email === "sent") parts.push("Email sent.");
  else if (status.email === "queued") parts.push("Email queued — will send shortly.");
  else if (status.email === "failed") parts.push("Email failed.");
  else if (status.email === "skipped") parts.push(status.emailDetail ?? "Email skipped.");
  return parts.join(" ");
}
