import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { loadClinicWhatsAppConnection } from "./sendMessage";

const GRAPH = "https://graph.facebook.com/v21.0";

type MetaTemplateComponent = {
  type?: string;
  text?: string;
  format?: string;
};

type MetaTemplateRow = {
  id?: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: MetaTemplateComponent[];
};

function mapMetaStatus(status: string): "draft" | "pending_approval" | "approved" | "rejected" {
  const s = status.toUpperCase();
  if (s === "APPROVED") return "approved";
  if (s === "PENDING" || s === "IN_APPEAL") return "pending_approval";
  if (s === "REJECTED" || s === "DISABLED" || s === "PAUSED") return "rejected";
  return "draft";
}

function mapMetaCategory(category: string): "MARKETING" | "UTILITY" | "AUTHENTICATION" {
  const c = category.toUpperCase();
  if (c === "MARKETING") return "MARKETING";
  if (c === "AUTHENTICATION") return "AUTHENTICATION";
  return "UTILITY";
}

function extractBodyText(components: MetaTemplateComponent[] | undefined): string {
  if (!components?.length) return "";
  const body = components.find((c) => c.type === "BODY");
  return body?.text?.trim() ?? "";
}

function displayName(metaName: string): string {
  return metaName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Extract {{1}} style variable placeholders from Meta template body. */
function metaNumberedVariables(body: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*(\d+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m[1]) found.add(`param_${m[1]}`);
  }
  return [...found];
}

async function fetchAllMetaTemplates(
  wabaId: string,
  accessToken: string
): Promise<MetaTemplateRow[]> {
  const out: MetaTemplateRow[] = [];
  let url: string | null =
    `${GRAPH}/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const json = (await res.json()) as {
      data?: MetaTemplateRow[];
      paging?: { next?: string };
      error?: { message: string };
    };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Meta templates API ${res.status}`);
    }
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }
  return out;
}

export type TemplateSyncResult = {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
};

/**
 * Pull approved/pending templates from Meta Business Manager into whatsapp_templates.
 * Standard practice for Practo-style clinic CRM WhatsApp modules (catalog stays in sync with WABA).
 */
export async function syncMetaTemplatesForDoctor(args: {
  client: SupabaseClient;
  clinicId: string;
  doctorId: string;
}): Promise<{ ok: true; result: TemplateSyncResult } | { ok: false; error: string }> {
  const conn = await loadClinicWhatsAppConnection(args.client, args.clinicId);
  if (!conn || conn.status !== "connected") {
    return { ok: false, error: "Connect WhatsApp Business before syncing templates." };
  }
  if (!conn.access_token) {
    return { ok: false, error: "Missing access token on connection." };
  }
  const wabaId = conn.waba_id?.trim();
  if (!wabaId) {
    return {
      ok: false,
      error: "WABA ID is missing. Reconnect via Meta Embedded Signup or add WABA ID in manual setup."
    };
  }

  let remote: MetaTemplateRow[];
  try {
    remote = await fetchAllMetaTemplates(wabaId, conn.access_token);
  } catch (e) {
    logger.warn("meta_template_sync_fetch_failed", {
      message: e instanceof Error ? e.message : String(e)
    });
    return { ok: false, error: e instanceof Error ? e.message : "Could not fetch Meta templates" };
  }

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of remote) {
    const body = extractBodyText(row.components);
    if (!body) {
      skipped += 1;
      continue;
    }

    const metaName = row.name;
    const languageCode = row.language ?? "en";
    const payload = {
      clinic_id: args.clinicId,
      doctor_id: args.doctorId,
      name: displayName(metaName),
      meta_template_name: metaName,
      meta_template_id: row.id ?? null,
      language_code: languageCode,
      category: mapMetaCategory(row.category),
      body,
      variables: metaNumberedVariables(body),
      status: mapMetaStatus(row.status),
      synced_at: now,
      updated_at: now
    };

    const { data: existing } = await args.client
      .from("whatsapp_templates")
      .select("id")
      .eq("clinic_id", args.clinicId)
      .eq("meta_template_name", metaName)
      .eq("language_code", languageCode)
      .maybeSingle();

    if (existing) {
      const { error } = await args.client
        .from("whatsapp_templates")
        .update(payload)
        .eq("id", (existing as { id: string }).id);
      if (error) {
        skipped += 1;
        continue;
      }
      updated += 1;
    } else {
      const { error } = await args.client.from("whatsapp_templates").insert({
        ...payload,
        created_at: now
      });
      if (error) {
        skipped += 1;
        continue;
      }
      created += 1;
    }
  }

  return {
    ok: true,
    result: {
      synced: created + updated,
      created,
      updated,
      skipped
    }
  };
}
