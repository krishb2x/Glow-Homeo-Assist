import type express from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import type { AuthClaims } from "./auth";
import { authRequired, requireAppRoles } from "./auth";
import { getDb } from "./db";
import { resolveClinicScope } from "./lib/clinicScope";
import { jsonError, jsonSuccess } from "./lib/apiEnvelope";
import { jsonErrorDb } from "./lib/safeError";

const MS_SUGGESTED_FOLLOWUP = 14 * 24 * 60 * 60 * 1000;

type FollowUpOut = {
  id: string;
  patientId: string;
  patientName: string;
  phone?: string;
  dueAt: string;
  overdue: boolean;
  title: string;
  sourceConsultationId: string;
  source: "intentional" | "suggested";
  reason?: string;
};

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/** Legacy 14-day suggested follow-ups (unchanged behavior, merged with DB rows). */
async function buildSuggestedFollowUps(
  client: ReturnType<typeof getDb>,
  clinicId: string,
  claims: AuthClaims
): Promise<FollowUpOut[]> {
  const { data: patients, error: pErr } = await client
    .from("patients")
    .select("id,name,phone")
    .eq("clinic_id", clinicId);
  if (pErr) throw new Error(pErr.message);
  const { data: allCons, error: cErr } = await client
    .from("consultations")
    .select("id,patient_id,ended_at")
    .eq("clinic_id", clinicId)
    .not("ended_at", "is", null);
  if (cErr) throw new Error(cErr.message);
  const lastByPatient = new Map<string, { ended: string; consultationId: string }>();
  for (const c of allCons ?? []) {
    const pid = (c as { patient_id: string }).patient_id;
    const end = (c as { ended_at: string }).ended_at;
    const id = (c as { id: string }).id;
    const t = new Date(end).getTime();
    const ex = lastByPatient.get(pid);
    if (!ex || t > new Date(ex.ended).getTime()) {
      lastByPatient.set(pid, { ended: end, consultationId: id });
    }
  }
  const nowMs = Date.now();
  const items: FollowUpOut[] = [];
  for (const p of patients ?? []) {
    const row = p as { id: string; name: string; phone: string | null };
    if (claims.role === "DOCTOR") {
      const { data: pat } = await client
        .from("patients")
        .select("assigned_doctor_id")
        .eq("id", row.id)
        .maybeSingle();
      const ad = (pat as { assigned_doctor_id: string | null } | null)?.assigned_doctor_id;
      if (ad && ad !== claims.userId) continue;
    }
    const last = lastByPatient.get(row.id);
    if (!last) continue;
    const dueMs = new Date(last.ended).getTime() + MS_SUGGESTED_FOLLOWUP;
    const dueAt = new Date(dueMs).toISOString();
    const overdue = nowMs > dueMs;
    items.push({
      id: `suggested-${row.id}-${last.consultationId}`,
      patientId: row.id,
      patientName: row.name,
      phone: row.phone ?? undefined,
      dueAt,
      overdue,
      title: "Post-consultation check-in",
      sourceConsultationId: last.consultationId,
      source: "suggested",
      reason: "14-day check-in after last visit"
    });
  }
  return items;
}

function dedupeFollowUps(intentional: FollowUpOut[], suggested: FollowUpOut[]): FollowUpOut[] {
  const seen = new Set<string>();
  const out: FollowUpOut[] = [];
  for (const it of intentional) {
    const k = `${it.patientId}|${it.dueAt.slice(0, 10)}`;
    seen.add(k);
    out.push(it);
  }
  for (const it of suggested) {
    const k = `${it.patientId}|${it.dueAt.slice(0, 10)}`;
    if (seen.has(k)) continue;
    out.push(it);
  }
  out.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  return out;
}

/**
 * Register HomeoSync doctor routes (my-day, appointments, merged follow-ups, case outcomes).
 */
export function registerHomeoSyncDoctorRoutes(app: express.Express): void {
  app.get(
    "/doctor/my-day",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const client = getDb(claims);
      const days = Math.min(14, Math.max(1, Number(req.query.days) || 7));
      const now = new Date();
      const from = now;
      const to = addDays(now, days);
      const doctorFilter =
        claims.role === "DOCTOR" ? claims.userId : (req.query.doctorId as string | undefined) || claims.userId;

      const upcoming: Array<{
        id: string;
        scheduledFor: string;
        durationMinutes: number;
        status: string;
        patientId: string;
        patientName: string;
        complexity: string | null;
        reason: string | null;
        chiefComplaint: string | null;
      }> = [];

      const { data: apts, error: aptErr } = await client
        .from("appointments")
        .select("id,scheduled_for,duration_minutes,status,patient_id,reason")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorFilter)
        .gte("scheduled_for", from.toISOString())
        .lte("scheduled_for", to.toISOString())
        .in("status", ["REQUESTED", "CONFIRMED", "IN_PROGRESS"])
        .order("scheduled_for", { ascending: true });
      if (!aptErr && apts) {
        for (const a of apts) {
          const r = a as {
            id: string;
            scheduled_for: string;
            duration_minutes: number;
            status: string;
            patient_id: string;
            reason: string | null;
          };
          const { data: p } = await client
            .from("patients")
            .select("name,initial_chief_complaint")
            .eq("id", r.patient_id)
            .maybeSingle();
          const pr = p as { name: string; initial_chief_complaint: string | null } | null;
          upcoming.push({
            id: r.id,
            scheduledFor: r.scheduled_for,
            durationMinutes: r.duration_minutes,
            status: r.status,
            patientId: r.patient_id,
            patientName: pr?.name ?? "Patient",
            complexity: null,
            reason: r.reason,
            chiefComplaint: pr?.initial_chief_complaint ?? null
          });
        }
      }

      const intentional: FollowUpOut[] = [];
      const { data: fuRows, error: fuErr } = await client
        .from("follow_ups")
        .select("id,patient_id,due_at,title,reason,status,doctor_id,consultation_id,completed_at")
        .eq("clinic_id", clinicId)
        .eq("status", "PENDING");
      if (!fuErr && fuRows) {
        for (const f of fuRows) {
          const fr = f as {
            id: string;
            patient_id: string;
            due_at: string;
            title: string;
            reason?: string;
            status: string;
            doctor_id: string | null;
            consultation_id: string | null;
          };
          if (fr.doctor_id && fr.doctor_id !== claims.userId && claims.role === "DOCTOR") continue;
          const { data: p } = await client
            .from("patients")
            .select("name,phone")
            .eq("id", fr.patient_id)
            .maybeSingle();
          const pr = p as { name: string; phone: string | null } | null;
          const due = new Date(fr.due_at).getTime();
          const rsn = fr.reason ?? fr.title;
          intentional.push({
            id: fr.id,
            patientId: fr.patient_id,
            patientName: pr?.name ?? "Patient",
            phone: pr?.phone ?? undefined,
            dueAt: fr.due_at,
            overdue: Date.now() > due,
            title: fr.title,
            sourceConsultationId: fr.consultation_id ?? "",
            source: "intentional",
            reason: rsn
          });
        }
      }
      let suggested: FollowUpOut[] = [];
      try {
        suggested = await buildSuggestedFollowUps(client, clinicId, claims);
      } catch {
        suggested = [];
      }
      const followUps = dedupeFollowUps(intentional, suggested);

      const pendingOutcomes: Array<{
        consultationId: string;
        patientId: string;
        patientName: string;
        endedAt: string;
        summary: string;
      }> = [];
      const since = new Date(Date.now() - 45 * 86400000).toISOString();
      const { data: endedCons } = await client
        .from("consultations")
        .select("id,patient_id,ended_at,note_final,note_draft")
        .eq("clinic_id", clinicId)
        .not("ended_at", "is", null)
        .gte("ended_at", since);
      if (endedCons) {
        const { data: outcomes, error: ocErr } = await client
          .from("case_outcomes")
          .select("consultation_id")
          .eq("clinic_id", clinicId);
        const hasOutcome = new Set(
          !ocErr ? (outcomes ?? []).map((o) => (o as { consultation_id: string }).consultation_id) : []
        );
        for (const c of endedCons) {
          const cr = c as { id: string; patient_id: string; ended_at: string; note_final: unknown; note_draft: unknown };
          if (hasOutcome.has(cr.id)) continue;
          if (!cr.note_final) continue;
          const { data: p } = await client.from("patients").select("name").eq("id", cr.patient_id).maybeSingle();
          const summ =
            (typeof (cr.note_final as { chiefComplaints?: string })?.chiefComplaints === "string"
              ? (cr.note_final as { chiefComplaints: string }).chiefComplaints
              : "Document outcome") || "Document outcome";
          pendingOutcomes.push({
            consultationId: cr.id,
            patientId: cr.patient_id,
            patientName: (p as { name: string } | null)?.name ?? "Patient",
            endedAt: cr.ended_at,
            summary: summ.slice(0, 200)
          });
        }
      }

      const needsNoteFinalization: Array<{
        consultationId: string;
        patientId: string;
        patientName: string;
        startedAt: string;
      }> = [];
      const { data: openNotes } = await client
        .from("consultations")
        .select("id,patient_id,started_at,note_draft,note_final,ended_at")
        .eq("clinic_id", clinicId)
        .not("ended_at", "is", null)
        .is("note_final", null)
        .not("note_draft", "is", null);
      if (openNotes) {
        for (const c of openNotes) {
          const cr = c as { id: string; patient_id: string; started_at: string };
          if (claims.role === "DOCTOR") {
            const { data: con } = await client
              .from("consultations")
              .select("attending_user_id")
              .eq("id", cr.id)
              .maybeSingle();
            const att = (con as { attending_user_id: string | null } | null)?.attending_user_id;
            if (att && att !== claims.userId) continue;
          }
          const { data: p } = await client.from("patients").select("name").eq("id", cr.patient_id).maybeSingle();
          needsNoteFinalization.push({
            consultationId: cr.id,
            patientId: cr.patient_id,
            patientName: (p as { name: string } | null)?.name ?? "Patient",
            startedAt: cr.started_at
          });
        }
      }

      type ActiveRow = { id: string; patientId: string; patientName: string; startedAt: string };
      const inClinicOpen: ActiveRow[] = [];
      const onlineOpen: ActiveRow[] = [];
      const { data: liveRows } = await client
        .from("consultations")
        .select("id,patient_id,started_at,consultation_mode,attending_user_id")
        .eq("clinic_id", clinicId)
        .is("ended_at", null);
      if (liveRows) {
        for (const c of liveRows) {
          const cr = c as {
            id: string;
            patient_id: string;
            started_at: string;
            consultation_mode: string;
            attending_user_id: string | null;
          };
          if (claims.role === "DOCTOR") {
            if (cr.attending_user_id && cr.attending_user_id !== claims.userId) continue;
          }
          const { data: p } = await client.from("patients").select("name").eq("id", cr.patient_id).maybeSingle();
          const row: ActiveRow = {
            id: cr.id,
            patientId: cr.patient_id,
            patientName: (p as { name: string } | null)?.name ?? "Patient",
            startedAt: cr.started_at
          };
          if (cr.consultation_mode === "ONLINE") onlineOpen.push(row);
          else inClinicOpen.push(row);
        }
      }
      inClinicOpen.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
      onlineOpen.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

      jsonSuccess(res, 200, {
        window: { from: from.toISOString(), to: to.toISOString(), days },
        upcomingAppointments: upcoming,
        followUps: followUps.slice(0, 40),
        pendingOutcomes: pendingOutcomes.slice(0, 20),
        needsNoteFinalization: needsNoteFinalization.slice(0, 15),
        activeConsultations: { inClinic: inClinicOpen, online: onlineOpen }
      });
    }
  );

  app.get(
    "/doctor/appointments",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)));
      const from = iso.safeParse(req.query.from);
      const to = iso.safeParse(req.query.to);
      if (!from.success || !to.success) {
        jsonError(res, 400, "Query `from` and `to` (ISO datetime) are required", { code: "VALIDATION_ERROR" });
        return;
      }
      const client = getDb(claims);
      const docId = (req.query.doctorId as string) || (claims.role === "DOCTOR" ? claims.userId : undefined);
      if (!docId) {
        jsonError(res, 400, "doctorId is required for admin", { code: "VALIDATION_ERROR" });
        return;
      }
      const { data, error } = await client
        .from("appointments")
        .select("id,scheduled_for,duration_minutes,status,patient_id,reason,notes")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", docId)
        .gte("scheduled_for", from.data)
        .lte("scheduled_for", to.data)
        .order("scheduled_for", { ascending: true });
      if (error) {
        jsonErrorDb(res, "appointments_list", error);
        return;
      }
      const rows: unknown[] = [];
      for (const a of data ?? []) {
        const r = a as { patient_id: string };
        const { data: p } = await client.from("patients").select("name").eq("id", r.patient_id).maybeSingle();
        rows.push({
          ...(a as object),
          patientName: (p as { name: string } | null)?.name ?? "Patient"
        });
      }
      jsonSuccess(res, 200, { items: rows });
    }
  );

  app.post(
    "/doctor/appointments",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = z
        .object({
          patientId: z.string().uuid(),
          scheduledFor: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
          durationMinutes: z.coerce.number().int().min(10).max(240).default(30),
          reason: z.string().max(2000).optional(),
          status: z.enum(["REQUESTED", "CONFIRMED"]).default("CONFIRMED"),
          doctorId: z.string().uuid().optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const client = getDb(claims);
      if (claims.role === "DOCTOR" && parsed.data.doctorId && parsed.data.doctorId !== claims.userId) {
        jsonError(res, 403, "Cannot book for another doctor", { code: "FORBIDDEN" });
        return;
      }
      const docId =
        claims.role === "DOCTOR" ? claims.userId : parsed.data.doctorId;
      if (!docId) {
        jsonError(res, 400, "doctorId is required when booking as admin", { code: "VALIDATION_ERROR" });
        return;
      }
      const { data, error } = await client
        .from("appointments")
        .insert({
          id: uuid(),
          clinic_id: clinicId,
          patient_id: parsed.data.patientId,
          doctor_id: docId,
          scheduled_for: parsed.data.scheduledFor,
          duration_minutes: parsed.data.durationMinutes,
          status: parsed.data.status,
          reason: parsed.data.reason ?? null
        })
        .select("id,scheduled_for,status,patient_id")
        .single();
      if (error) {
        jsonErrorDb(res, "appointments_create", error);
        return;
      }
      jsonSuccess(res, 201, data);
    }
  );

  app.patch(
    "/doctor/appointments/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = z
        .object({
          status: z.enum(["CANCELLED", "COMPLETED", "NO_SHOW", "CONFIRMED", "IN_PROGRESS"]).optional(),
          scheduledFor: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date").optional(),
          durationMinutes: z.coerce.number().int().min(10).max(240).optional()
        })
        .refine((b) => b.status != null || b.scheduledFor != null || b.durationMinutes != null, {
          message: "Provide at least one of: status, scheduledFor, durationMinutes"
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const client = getDb(claims);
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (parsed.data.status != null) updates.status = parsed.data.status;
      if (parsed.data.scheduledFor != null) updates.scheduled_for = parsed.data.scheduledFor;
      if (parsed.data.durationMinutes != null) updates.duration_minutes = parsed.data.durationMinutes;
      const { data, error } = await client
        .from("appointments")
        .update(updates)
        .eq("id", req.params.id)
        .eq("clinic_id", clinicId)
        .select("id,status")
        .maybeSingle();
      if (error) {
        jsonErrorDb(res, "appointments_patch", error);
        return;
      }
      if (!data) {
        jsonError(res, 404, "Appointment not found", { code: "NOT_FOUND" });
        return;
      }
      jsonSuccess(res, 200, data);
    }
  );

  app.post(
    "/doctor/follow-ups",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = z
        .object({
          patientId: z.string().uuid(),
          dueAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
          reason: z.string().min(1).max(2000),
          consultationId: z.string().uuid().optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const client = getDb(claims);
      const title = parsed.data.reason.length > 120 ? `${parsed.data.reason.slice(0, 117)}…` : parsed.data.reason;
      const { data, error } = await client
        .from("follow_ups")
        .insert({
          id: uuid(),
          clinic_id: clinicId,
          patient_id: parsed.data.patientId,
          consultation_id: parsed.data.consultationId ?? null,
          title,
          reason: parsed.data.reason,
          due_at: parsed.data.dueAt,
          doctor_id: claims.userId,
          status: "PENDING"
        })
        .select("id,due_at,reason,status")
        .single();
      if (error) {
        jsonErrorDb(res, "followup_create", error);
        return;
      }
      jsonSuccess(res, 201, data);
    }
  );

  app.patch(
    "/doctor/follow-ups/:id",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid follow-up id", { code: "VALIDATION_ERROR" });
        return;
      }
      const parsed = z
        .object({
          status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"]).optional(),
          dueAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date").optional(),
          reason: z.string().min(1).max(2000).optional()
        })
        .refine((b) => b.status != null || b.dueAt != null || b.reason != null, {
          message: "Provide at least one of: status, dueAt, reason"
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const client = getDb(claims);
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (parsed.data.status != null) {
        updates.status = parsed.data.status;
        if (parsed.data.status === "COMPLETED") updates.completed_at = new Date().toISOString();
        if (parsed.data.status === "PENDING") updates.completed_at = null;
      }
      if (parsed.data.dueAt != null) updates.due_at = parsed.data.dueAt;
      if (parsed.data.reason != null) {
        updates.reason = parsed.data.reason;
        const t = parsed.data.reason;
        updates.title = t.length > 120 ? `${t.slice(0, 117)}…` : t;
      }
      const { data, error } = await client
        .from("follow_ups")
        .update(updates)
        .eq("id", idParse.data)
        .eq("clinic_id", clinicId)
        .select("id,status,due_at,completed_at,reason,title")
        .maybeSingle();
      if (error) {
        jsonErrorDb(res, "followup_patch", error);
        return;
      }
      if (!data) {
        jsonError(res, 404, "Follow-up not found", { code: "NOT_FOUND" });
        return;
      }
      jsonSuccess(res, 200, data);
    }
  );

  app.get(
    "/doctor/follow-ups",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const client = getDb(claims);
      const intentional: FollowUpOut[] = [];
      const { data: fuRows, error: fuErr } = await client
        .from("follow_ups")
        .select("id,patient_id,due_at,title,reason,status,doctor_id,consultation_id")
        .eq("clinic_id", clinicId)
        .eq("status", "PENDING");
      if (!fuErr && fuRows) {
        for (const f of fuRows) {
          const fr = f as {
            id: string;
            patient_id: string;
            due_at: string;
            title: string;
            reason?: string;
            status: string;
            doctor_id: string | null;
            consultation_id: string | null;
          };
          if (fr.doctor_id && fr.doctor_id !== claims.userId && claims.role === "DOCTOR") continue;
          const { data: p } = await client
            .from("patients")
            .select("name,phone")
            .eq("id", fr.patient_id)
            .maybeSingle();
          const pr = p as { name: string; phone: string | null } | null;
          const due = new Date(fr.due_at).getTime();
          intentional.push({
            id: fr.id,
            patientId: fr.patient_id,
            patientName: pr?.name ?? "Patient",
            phone: pr?.phone ?? undefined,
            dueAt: fr.due_at,
            overdue: Date.now() > due,
            title: fr.title,
            sourceConsultationId: fr.consultation_id ?? "",
            source: "intentional",
            reason: fr.reason ?? fr.title
          });
        }
      }
      let suggested: FollowUpOut[] = [];
      try {
        suggested = await buildSuggestedFollowUps(client, clinicId, claims);
      } catch {
        suggested = [];
      }
      const items = dedupeFollowUps(intentional, suggested);
      jsonSuccess(res, 200, {
        items: items.map((it) => ({
          patientId: it.patientId,
          patientName: it.patientName,
          phone: it.phone,
          dueAt: it.dueAt,
          overdue: it.overdue,
          title: it.title,
          sourceConsultationId: it.sourceConsultationId,
          source: it.source,
          reason: it.reason,
          id: it.id
        }))
      });
    }
  );

  app.post(
    "/doctor/case-outcomes",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = z
        .object({
          consultationId: z.string().uuid(),
          patientId: z.string().uuid(),
          outcome: z.enum(["CURE", "IMPROVEMENT", "PALLIATION", "NO_CHANGE", "WORSE"]),
          assessment: z.string().max(8000).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const client = getDb(claims);
      const { data, error } = await client
        .from("case_outcomes")
        .insert({
          id: uuid(),
          clinic_id: clinicId,
          patient_id: parsed.data.patientId,
          consultation_id: parsed.data.consultationId,
          doctor_id: claims.userId,
          outcome: parsed.data.outcome,
          assessment: parsed.data.assessment ?? null
        })
        .select("id,documented_at")
        .single();
      if (error) {
        jsonErrorDb(res, "case_outcome_create", error);
        return;
      }
      jsonSuccess(res, 201, data);
    }
  );

  app.get(
    "/doctor/inbox",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const limit = Math.min(120, Math.max(5, parseInt(String(req.query.limit ?? "60"), 10) || 60));
      const patientFilter = typeof req.query.patientId === "string" && req.query.patientId.length > 0
        ? String(req.query.patientId)
        : null;
      const client = getDb(claims);
      let q = client
        .from("patient_inbox_messages")
        .select("id,patient_id,body,direction,read_at,created_at")
        .eq("clinic_id", clinicId);
      if (patientFilter) {
        q = q.eq("patient_id", patientFilter);
      }
      const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(limit);
      if (error) {
        if (String(error.message ?? "").toLowerCase().includes("relation") || (error as { code?: string }).code === "42P01") {
          jsonSuccess(res, 200, { items: [] as unknown[] });
          return;
        }
        jsonErrorDb(res, "inbox_list", error);
        return;
      }
      const pids = [...new Set((rows ?? []).map((r) => (r as { patient_id: string }).patient_id))];
      const nameById = new Map<string, string>();
      if (pids.length > 0) {
        const { data: pts } = await client.from("patients").select("id,name").in("id", pids).eq("clinic_id", clinicId);
        for (const p of pts ?? []) {
          const row = p as { id: string; name: string };
          nameById.set(row.id, row.name);
        }
      }
      const items = (rows ?? []).map((r) => {
        const row = r as {
          id: string;
          patient_id: string;
          body: string;
          direction: string;
          read_at: string | null;
          created_at: string;
        };
        return {
          id: row.id,
          patientId: row.patient_id,
          patientName: nameById.get(row.patient_id) ?? "Patient",
          body: row.body,
          readAt: row.read_at,
          createdAt: row.created_at,
          // Conversational threads need both sides; UI uses `fromDoctor` to align bubbles.
          fromDoctor: row.direction === "CLINIC"
        };
      });
      jsonSuccess(res, 200, { items });
    }
  );

  app.post(
    "/doctor/inbox/reply",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const parsed = z
        .object({
          patientId: z.string().uuid(),
          body: z.string().min(1).max(4000),
          inReplyToMessageId: z.string().uuid().optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const client = getDb(claims);
      const { data: pat } = await client
        .from("patients")
        .select("id")
        .eq("id", parsed.data.patientId)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!pat) {
        jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
        return;
      }
      const { data, error } = await client
        .from("patient_inbox_messages")
        .insert({
          id: uuid(),
          clinic_id: clinicId,
          patient_id: parsed.data.patientId,
          body: parsed.data.body.trim(),
          direction: "CLINIC",
          read_at: new Date().toISOString(),
          created_by_user_id: claims.userId
        })
        .select("id,created_at")
        .single();
      if (error) {
        if (String(error.message ?? "").toLowerCase().includes("relation") || (error as { code?: string }).code === "42P01") {
          jsonError(res, 501, "Inbox is not available until migration is applied.", { code: "INBOX_NOT_READY" });
          return;
        }
        jsonErrorDb(res, "inbox_reply", error);
        return;
      }
      if (parsed.data.inReplyToMessageId) {
        await client
          .from("patient_inbox_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("id", parsed.data.inReplyToMessageId)
          .eq("clinic_id", clinicId);
      }
      jsonSuccess(res, 201, data);
    }
  );

  app.post(
    "/doctor/inbox/:messageId/read",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const messageId = req.params.messageId;
      const client = getDb(claims);
      const { error } = await client
        .from("patient_inbox_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("clinic_id", clinicId);
      if (error) {
        jsonErrorDb(res, "inbox_read", error);
        return;
      }
      jsonSuccess(res, 200, { ok: true });
    }
  );
}
