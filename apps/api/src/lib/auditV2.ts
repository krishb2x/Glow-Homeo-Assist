import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

export type AuditV2Event = {
  clinicId: string | null;
  actorId: string | null;
  actorRole?: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Append to audit.events (service role). Non-fatal — logs and returns false on failure.
 * Requires v2 migration `20260520000000_v2_consult_workspace.sql`.
 */
export async function writeAuditV2Event(admin: SupabaseClient, event: AuditV2Event): Promise<boolean> {
  const { error } = await admin.schema("audit").from("events").insert({
    clinic_id: event.clinicId,
    actor_id: event.actorId,
    actor_role: event.actorRole ?? null,
    entity_type: event.entityType,
    entity_id: event.entityId,
    action: event.action,
    payload: event.payload ?? null,
    ip: event.ip ?? null,
    user_agent: event.userAgent ?? null
  });

  if (error) {
    logger.warn("audit_v2_write_failed", { action: event.action, message: error.message });
    return false;
  }
  return true;
}
