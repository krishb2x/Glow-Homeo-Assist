/**
 * PHASE 1: Comprehensive Audit Logging
 * Tracks all mutations (create, update, delete) with before/after states
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./lib/logger";

export type AuditAction = 
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PERMISSION_CHANGE"
  | "EXPORT"
  | "DOWNLOAD";

export type AuditLogEntry = {
  id: string;
  created_at: string;
  actor_id: string;
  actor_email?: string;
  clinic_id: string;
  action: AuditAction;
  resource_type: string; // e.g., "consultation", "prescription", "patient"
  resource_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
};

/**
 * Log an audit event
 */
export async function logAuditEvent(
  client: SupabaseClient,
  event: {
    actorId: string;
    actorEmail?: string;
    clinicId: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AuditLogEntry | null> {
  const { data, error } = await client.from("audit_log").insert({
    actor_id: event.actorId,
    actor_email: event.actorEmail,
    clinic_id: event.clinicId,
    action: event.action,
    resource_type: event.resourceType,
    resource_id: event.resourceId,
    before_state: event.beforeState ?? null,
    after_state: event.afterState ?? null,
    metadata: event.metadata,
    ip_address: event.ipAddress,
    user_agent: event.userAgent
  }).select().single();

  if (error) {
    logger.error("audit_log insert failed", { message: error.message });
    return null;
  }

  return data as AuditLogEntry;
}

/**
 * Query audit logs for a resource
 */
export async function getAuditLogsForResource(
  client: SupabaseClient,
  clinicId: string,
  resourceType: string,
  resourceId: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await client
    .from("audit_log")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("audit_log query failed", { message: error.message });
    return [];
  }

  return (data ?? []) as AuditLogEntry[];
}

/**
 * Query audit logs for an actor (user)
 */
export async function getAuditLogsForActor(
  client: SupabaseClient,
  clinicId: string,
  actorId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const { data, error } = await client
    .from("audit_log")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("actor audit query failed", { message: error.message });
    return [];
  }

  return (data ?? []) as AuditLogEntry[];
}

/**
 * Query all audit logs for clinic (admin/compliance)
 */
export async function getAuditLogsForClinic(
  client: SupabaseClient,
  clinicId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    resourceType?: string;
  }
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  let query = client
    .from("audit_log")
    .select("*", { count: "exact" })
    .eq("clinic_id", clinicId);

  if (options?.action) {
    query = query.eq("action", options.action);
  }

  if (options?.resourceType) {
    query = query.eq("resource_type", options.resourceType);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 100) - 1);

  if (error) {
    logger.error("clinic audit query failed", { message: error.message });
    return { logs: [], total: 0 };
  }

  return {
    logs: (data ?? []) as AuditLogEntry[],
    total: count ?? 0
  };
}
