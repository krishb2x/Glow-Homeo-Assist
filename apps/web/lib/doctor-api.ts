import { signOutSupabaseClient } from "./supabase-browser";
import { isDemoMode, isDemoFallback } from "./demo-mode";
import {
  buildDemoAppointmentsWeek,
  buildDemoMyDay,
  DEMO_DASHBOARD_RECENT,
  DEMO_INBOX,
  DEMO_PATIENTS,
  DEMO_WORKSPACE,
  type AppointmentListItem
} from "./demo-data";

/**
 * Direct calls to the Express API (CORS on :4000, browser sends `Authorization: Bearer` from localStorage).
 * Set `NEXT_PUBLIC_API_URL` in the monorepo root `.env` (e.g. http://localhost:4000).
 */
export const API_BASE =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" && process.env.NEXT_PUBLIC_API_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ha_token");
}

/** UUID stored at login or set in Settings for platform admins (sent as `X-Clinic-Id`). */
export function getStoredClinicId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("ha_clinic_id");
  if (!raw || raw.trim() === "") return null;
  return raw.trim();
}

export function setStoredClinicId(clinicId: string | null): void {
  if (typeof window === "undefined") return;
  if (clinicId == null || clinicId === "") {
    localStorage.removeItem("ha_clinic_id");
  } else {
    localStorage.setItem("ha_clinic_id", clinicId.trim());
  }
}

export function getStoredRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ha_role");
}

const GENERIC_LOAD_ERROR = "Unable to load data. Please try again.";

/**
 * Parses JSON body with `{ success: true, data }` or throws on `{ success: false, error }`.
 */
export function parseApiData<T>(data: unknown): T {
  if (data && typeof data === "object" && "success" in data) {
    const o = data as { success: boolean; data?: T; error?: string; code?: string };
    if (o.success === true && "data" in o) return o.data as T;
    if (o.success === false) {
      const err = new Error(o.error ?? GENERIC_LOAD_ERROR);
      (err as Error & { code?: string }).code = o.code;
      throw err;
    }
  }
  throw new Error("Invalid response from server");
}

/** Read user-facing error from API JSON (envelope or legacy). */
export function readApiError(data: unknown): string | undefined {
  if (data && typeof data === "object" && "success" in data) {
    const o = data as { success?: boolean; error?: string };
    if (o.success === false && typeof o.error === "string") return o.error;
  }
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: string }).error;
    return typeof e === "string" && e.length > 0 ? e : undefined;
  }
  return undefined;
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ha_token");
  localStorage.removeItem("ha_role");
  localStorage.removeItem("ha_clinic_id");
  localStorage.removeItem("gh_active_clinic_id");
  signOutSupabaseClient();
}

function redirectSessionExpired(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  window.location.assign("/login?reason=session_expired");
}

/**
 * Authed API JSON fetch with 401/403 → clear session and redirect; network errors → friendly message.
 */
export async function apiFetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  let data: unknown = {};
  try {
    const r = await fetch(url, jsonRequest(init));
    data = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) {
      clearClientSession();
      redirectSessionExpired();
      throw new Error("SESSION_EXPIRED");
    }
    if (!r.ok) {
      throw new Error(readApiError(data) ?? GENERIC_LOAD_ERROR);
    }
    return parseApiData<T>(data);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(GENERIC_LOAD_ERROR);
    }
    throw e;
  }
}

export function authJsonHeaders(): HeadersInit {
  const t = getToken();
  const clinic = getStoredClinicId();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(clinic ? { "X-Clinic-Id": clinic } : {})
  };
}

/**
 * Authed API fetch (Bearer from localStorage). Uses CORS; no cookies required.
 */
export function jsonRequest(init: RequestInit = {}): RequestInit {
  return {
    credentials: "include",
    ...init,
    headers: { ...(authJsonHeaders() as Record<string, string>), ...(init.headers as Record<string, string>) }
  };
}

/**
 * Returns the same-origin Next.js proxy path for an API route.
 * All authenticated HTTP calls must use this — browser never talks to the Express
 * port directly, which eliminates CORS issues for any origin/device.
 */
export function haProxyPath(segments: string): string {
  if (segments.startsWith("/")) segments = segments.slice(1);
  return `/api/ha-proxy/${segments}`;
}

export type AuthMe = {
  role: "SUPER_ADMIN" | "DOCTOR" | "PATIENT";
  userId: string;
  clinicId: string | null;
};

export async function fetchAuthMe(): Promise<AuthMe> {
  if (isDemoMode()) {
    return { role: "DOCTOR", userId: "demo", clinicId: "11111111-1111-1111-1111-111111111101" };
  }
  return apiFetchJson<AuthMe>(haProxyPath("auth/me"), { method: "GET" });
}

export type AdminClinicRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  location?: string | null;
  is_active?: boolean;
  doctor_count?: number;
};

export type AdminDoctorRow = {
  id: string;
  full_name: string;
  role: string;
  clinic_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type AdminDoctorRowWithClinic = AdminDoctorRow & { clinic_name: string | null };

export type AdminClinicDetail = {
  clinic: AdminClinicRow;
  doctors: AdminDoctorRow[];
};

// ─── Feature Flags ────────────────────────────────────────────────────────────

export type PlanTier = "BASIC" | "PRO" | "ENTERPRISE";

export type ClinicFeatures = {
  planTier: PlanTier;
  messages: boolean;
  whatsappIntegration: boolean;
};

export type ClinicFeatureOverride = {
  featureKey: string;
  enabled: boolean;
  notes: string | null;
  updatedAt: string | null;
};

export type AdminClinicFeaturesResponse = {
  planTier: PlanTier;
  features: ClinicFeatures;
  overrides: ClinicFeatureOverride[];
  planDefaults: Record<string, string[]>;
};

export async function getAdminClinicFeatures(clinicId: string): Promise<AdminClinicFeaturesResponse> {
  if (isDemoMode()) {
    return {
      planTier: "PRO",
      features: { planTier: "PRO", messages: true, whatsappIntegration: false },
      overrides: [],
      planDefaults: { BASIC: ["messages"], PRO: ["messages"], ENTERPRISE: ["messages", "whatsapp_integration"] }
    };
  }
  return apiFetchJson<AdminClinicFeaturesResponse>(haProxyPath(`admin/clinics/${encodeURIComponent(clinicId)}/features`), { method: "GET" });
}

export async function patchAdminClinicFeatures(
  clinicId: string,
  body: { planTier?: PlanTier; overrides?: Record<string, boolean> }
): Promise<{ planTier: PlanTier; features: ClinicFeatures }> {
  if (isDemoMode()) {
    return { planTier: body.planTier ?? "PRO", features: { planTier: body.planTier ?? "PRO", messages: true, whatsappIntegration: false } };
  }
  return apiFetchJson<{ planTier: PlanTier; features: ClinicFeatures }>(
    haProxyPath(`admin/clinics/${encodeURIComponent(clinicId)}/features`),
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export type PlatformSummary = {
  stats: {
    totalClinics: number;
    totalDoctors: number;
    totalPatients: number;
    consultationsToday: number;
  };
  growth: { consultationsLast7d: number };
  recentActivity: Array<{
    id: string;
    at: string;
    kind: "clinic" | "doctor";
    title: string;
    subtitle: string | null;
  }>;
};

export async function listAdminClinics(): Promise<{ items: AdminClinicRow[] }> {
  if (isDemoMode()) {
    return {
      items: [
        {
          id: "11111111-1111-1111-1111-111111111101",
          name: "Verdant Homeo Clinic",
          slug: "verdant",
          created_at: new Date().toISOString(),
          location: "Bengaluru, IN",
          is_active: true,
          doctor_count: 2
        },
        {
          id: "22222222-2222-2222-2222-222222222202",
          name: "Coastal Remedies",
          slug: "coastal",
          created_at: new Date().toISOString(),
          location: "Mumbai, IN",
          is_active: true,
          doctor_count: 1
        }
      ]
    };
  }
  const items = await apiFetchJson<AdminClinicRow[]>(haProxyPath("admin/clinics"), { method: "GET" });
  return { items: Array.isArray(items) ? items : [] };
}

export async function getAdminClinic(id: string): Promise<AdminClinicDetail> {
  if (isDemoMode()) {
    const { items } = await listAdminClinics();
    const c = items.find((x) => x.id === id) ?? items[0];
    if (!c) throw new Error("Clinic not found");
    return {
      clinic: c,
      doctors: [
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          full_name: "Dr. A. Iyer",
          role: "doctor",
          clinic_id: c.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
  }
  return apiFetchJson<AdminClinicDetail>(haProxyPath(`admin/clinics/${encodeURIComponent(id)}`), { method: "GET" });
}

export async function createClinic(
  name: string,
  opts?: { slug?: string; location?: string | null; is_active?: boolean }
): Promise<AdminClinicRow> {
  return apiFetchJson<AdminClinicRow>(haProxyPath("admin/clinics"), {
    method: "POST",
    body: JSON.stringify({ name, slug: opts?.slug, location: opts?.location, is_active: opts?.is_active })
  });
}

export async function updateAdminClinic(
  id: string,
  body: { name?: string; slug?: string | null; location?: string | null; is_active?: boolean }
): Promise<AdminClinicRow> {
  if (isDemoMode()) {
    return {
      id,
      name: body.name ?? "Clinic",
      slug: null,
      created_at: new Date().toISOString(),
      location: body.location,
      is_active: body.is_active ?? true,
      doctor_count: 0
    };
  }
  return apiFetchJson<AdminClinicRow>(haProxyPath(`admin/clinics/${encodeURIComponent(id)}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function createAdminDoctor(
  name: string,
  email: string,
  clinicId: string,
  opts?: { initialPassword?: string }
): Promise<{
  id: string;
  email: string;
  full_name: string;
  clinicId: string;
  /** The active password: either the one you set or the one the server generated. */
  temporaryPassword: string;
}> {
  if (isDemoMode()) {
    return {
      id: "demo-doc-id",
      email,
      full_name: name,
      clinicId,
      temporaryPassword: opts?.initialPassword?.trim() || "DemoTemp-9a!xChangeMe"
    };
  }
  const body: { name: string; email: string; clinicId: string; password?: string } = { name, email, clinicId };
  const p = opts?.initialPassword?.trim();
  if (p && p.length > 0) {
    body.password = p;
  }
  return apiFetchJson(haProxyPath("admin/doctors"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function fetchAdminPlatformSummary(): Promise<PlatformSummary> {
  if (isDemoMode()) {
    return {
      stats: {
        totalClinics: 2,
        totalDoctors: 4,
        totalPatients: 18,
        consultationsToday: 3
      },
      growth: { consultationsLast7d: 12 },
      recentActivity: [
        {
          id: "1",
          at: new Date().toISOString(),
          kind: "clinic",
          title: "Verdant Homeo Clinic",
          subtitle: "Clinic created"
        },
        {
          id: "2",
          at: new Date().toISOString(),
          kind: "doctor",
          title: "Dr. A. Iyer",
          subtitle: "Doctor profile"
        }
      ]
    };
  }
  return apiFetchJson<PlatformSummary>(haProxyPath("admin/platform-summary"), { method: "GET" });
}

export type MarketingLeadIntent = "walkthrough" | "trial";
export type MarketingLeadStatus = "new" | "contacted" | "qualified" | "closed" | "lost";

export type AdminMarketingLeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  clinic_name: string;
  city: string;
  message: string | null;
  intent: MarketingLeadIntent;
  lead_status: MarketingLeadStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAdminMarketingLeads(params?: {
  status?: MarketingLeadStatus;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminMarketingLeadRow[]; total: number }> {
  if (isDemoMode()) {
    const now = new Date().toISOString();
    const all: AdminMarketingLeadRow[] = [
      {
        id: "33333333-3333-3333-3333-333333333301",
        name: "Dr. Demo Walkthrough",
        phone: "+91 98765 43210",
        email: "walkthrough.demo@glowhomeo.example",
        clinic_name: "GlowHomeo Assist — 20-minute walkthrough",
        city: "Bengaluru",
        message: "Practice: Verdant Clinic",
        intent: "walkthrough",
        lead_status: "new",
        admin_notes: null,
        created_at: now,
        updated_at: now
      },
      {
        id: "33333333-3333-3333-3333-333333333302",
        name: "Dr. Demo Trial",
        phone: "+91 91234 56789",
        email: "trial.demo@glowhomeo.example",
        clinic_name: "GlowHomeo Assist — 90-day guided trial",
        city: "Mumbai",
        message: null,
        intent: "trial",
        lead_status: "contacted",
        admin_notes: "Called — interested in Q3",
        created_at: now,
        updated_at: now
      }
    ];
    const filtered = params?.status ? all.filter((r) => r.lead_status === params.status) : all;
    return { items: filtered, total: filtered.length };
  }
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return apiFetchJson<{ items: AdminMarketingLeadRow[]; total: number }>(
    haProxyPath(`admin/marketing-leads${qs ? `?${qs}` : ""}`),
    { method: "GET" }
  );
}

export async function patchAdminMarketingLead(
  id: string,
  body: { lead_status?: MarketingLeadStatus; admin_notes?: string | null }
): Promise<AdminMarketingLeadRow> {
  if (isDemoMode()) {
    const { items } = await listAdminMarketingLeads();
    const base = items.find((r) => r.id === id) ?? items[0];
    if (!base) {
      throw new Error("Lead not found");
    }
    const now = new Date().toISOString();
    return {
      ...base,
      id,
      lead_status: body.lead_status ?? base.lead_status,
      admin_notes: body.admin_notes !== undefined ? body.admin_notes : base.admin_notes,
      updated_at: now
    };
  }
  return apiFetchJson<AdminMarketingLeadRow>(haProxyPath(`admin/marketing-leads/${encodeURIComponent(id)}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function listDoctorsInClinic(clinicId: string): Promise<AdminDoctorRow[]> {
  return apiFetchJson<AdminDoctorRow[]>(haProxyPath(`admin/doctors?clinicId=${encodeURIComponent(clinicId)}`), {
    method: "GET"
  });
}

/** All doctor profiles (platform directory). */
export async function listAllAdminDoctors(): Promise<AdminDoctorRowWithClinic[]> {
  if (isDemoMode()) {
    return [
      {
        id: "d1",
        full_name: "Dr. Ananya Iyer",
        role: "doctor",
        clinic_id: "11111111-1111-1111-1111-111111111101",
        created_at: "",
        updated_at: "",
        clinic_name: "Verdant Homeo Clinic"
      },
      {
        id: "d2",
        full_name: "Dr. R. Menon",
        role: "doctor",
        clinic_id: "11111111-1111-1111-1111-111111111101",
        created_at: "",
        updated_at: "",
        clinic_name: "Verdant Homeo Clinic"
      }
    ];
  }
  return apiFetchJson<AdminDoctorRowWithClinic[]>(haProxyPath("admin/doctors"), { method: "GET" });
}

export async function getAccessTokenForClient(): Promise<string | null> {
  return getToken();
}

export type { AppointmentListItem };

/** Demo or API — used for schedule / appointments list. */
export async function fetchAppointmentsRange(fromIso: string, toIso: string): Promise<AppointmentListItem[]> {
  const fromT = new Date(fromIso).getTime();
  const toT = new Date(toIso).getTime();
  if (isDemoMode()) {
    return buildDemoAppointmentsWeek().filter((a) => {
      const t = new Date(a.scheduledFor).getTime();
      return t >= fromT && t <= toT;
    });
  }
  try {
    const env = await apiFetchJson<{ items: Record<string, unknown>[] }>(
      `${haProxyPath("doctor/appointments")}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
      { method: "GET" }
    );
    const raw = env.items ?? [];
    return raw.map((row) => {
      const a = row as {
        id: string;
        scheduled_for: string;
        duration_minutes: number;
        status: string;
        patient_id: string;
        reason: string | null;
        patientName?: string;
        consultation_mode?: string;
        meeting_url?: string | null;
      };
      return {
        id: a.id,
        scheduledFor: a.scheduled_for,
        durationMinutes: a.duration_minutes,
        status: a.status,
        patientId: a.patient_id,
        patientName: a.patientName ?? "Patient",
        reason: a.reason,
        consultationMode:
          a.consultation_mode === "ONLINE" ? "ONLINE" : ("IN_CLINIC" as const),
        meetingUrl: a.meeting_url ?? null
      };
    });
  } catch (e) {
    if (isDemoFallback()) {
      return buildDemoAppointmentsWeek().filter((a) => {
        const t = new Date(a.scheduledFor).getTime();
        return t >= fromT && t <= toT;
      });
    }
    throw e;
  }
}

/** Shown on patients and schedule; keep in sync with `patient-tag-styles`. */
export type PatientTag = "chronic" | "acute" | "first_visit" | "follow_up";

export type PatientListItem = {
  id: string;
  name: string;
  phone?: string;
  languagePreference?: string | null;
  age?: number;
  initialChiefComplaint?: string;
  createdAt: string;
  lastVisitAt?: string | null;
  status?: "stable" | "critical";
  /** Clinical / workflow flags for triage and list display. */
  tags?: PatientTag[];
};

export type CaseOutcomeValue = "CURE" | "IMPROVEMENT" | "PALLIATION" | "NO_CHANGE" | "WORSE";

export type PendingPriorOutcome = {
  consultationId: string;
  endedAt: string;
  summary: string;
};

export type LastCaseOutcome = {
  outcome: CaseOutcomeValue;
  documentedAt: string;
  assessment?: string;
};

export type FollowUpQueueItem = {
  id?: string;
  patientId: string;
  patientName: string;
  phone?: string;
  dueAt: string;
  overdue: boolean;
  title: string;
  sourceConsultationId: string;
  source?: "intentional" | "suggested";
  reason?: string;
};

export type MyDayAppointment = {
  id: string;
  scheduledFor: string;
  durationMinutes: number;
  status: string;
  patientId: string;
  patientName: string;
  complexity: string | null;
  reason: string | null;
  chiefComplaint: string | null;
  consultationMode?: "IN_CLINIC" | "ONLINE";
  /** When set, schedule UI uses this; otherwise it is derived from reason + patient tags. */
  displayTag?: PatientTag;
};

export type ActiveConsultationRow = {
  id: string;
  patientId: string;
  patientName: string;
  startedAt: string;
  videoStatus?: string | null;
  patientWaitingSince?: string | null;
};

export type MyDayResponse = {
  window: { from: string; to: string; days?: number };
  upcomingAppointments: MyDayAppointment[];
  followUps: FollowUpQueueItem[];
  pendingOutcomes: Array<{
    consultationId: string;
    patientId: string;
    patientName: string;
    endedAt: string;
    summary: string;
  }>;
  needsNoteFinalization: Array<{
    consultationId: string;
    patientId: string;
    patientName: string;
    startedAt: string;
  }>;
  activeConsultations?: {
    inClinic: ActiveConsultationRow[];
    online: ActiveConsultationRow[];
  };
  missedConsultationsToday?: Array<{
    appointmentId: string;
    patientId: string;
    patientName: string;
    scheduledFor: string;
    noShowNotified: boolean;
  }>;
};

export type PrescriptionDocumentPrefs = {
  showClinicDetails: boolean;
  showSignature: boolean;
  showRegistrationNumber: boolean;
};

export type WorkspaceContext = {
  fullName: string;
  firstName: string;
  clinicName: string | null;
  clinicLocation?: string | null;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  clinicEmail?: string | null;
  clinicRegistrationNumber?: string | null;
  clinicId: string | null;
  /** @deprecated use qualification */
  credentials?: string | null;
  qualification?: string | null;
  registrationNumber?: string | null;
  specialty?: string | null;
  signatureObjectKey?: string | null;
  signatureUrl?: string | null;
  prescriptionDocumentPrefs?: PrescriptionDocumentPrefs;
  /** Set by `GET /doctor/workspace-context` (domain role). */
  role?: "SUPER_ADMIN" | "DOCTOR" | "PATIENT";
  /** Effective feature flags for the clinic (plan + admin overrides). */
  features?: ClinicFeatures;
};

export type AdviceTemplate = {
  id: string;
  title: string;
  category: "diet" | "lifestyle" | "restriction";
  content: string;
  isShared: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TreatmentPlan = {
  id: string;
  title: string;
  description?: string | null;
  dietAdvice?: string | null;
  lifestyleAdvice?: string | null;
  restrictionAdvice?: string | null;
  remedyGuidelines?: string | null;
  linkedTemplateIds: string[];
  isShared: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InboxMessageItem = {
  id: string;
  patientId: string;
  patientName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  /** When true, message is from the doctor (right-aligned in chat UI). */
  fromDoctor?: boolean;
};

export type DashboardRecentItem = {
  id: string;
  kind: "message" | "prescription" | "followup";
  title: string;
  /** Short detail line */
  subtitle?: string;
  at: string;
  href?: string;
};

export async function fetchWorkspaceContext(): Promise<WorkspaceContext> {
  if (isDemoMode()) return { ...DEMO_WORKSPACE };
  try {
    const ctx = await apiFetchJson<WorkspaceContext>(haProxyPath("doctor/workspace-context"), { method: "GET" });
    if (typeof window !== "undefined" && ctx.clinicId) {
      localStorage.setItem("ha_clinic_id", ctx.clinicId);
    }
    return ctx;
  } catch (e) {
    if (isDemoFallback()) return { ...DEMO_WORKSPACE };
    throw e;
  }
}

export async function patchPrescriptionBranding(body: {
  qualification?: string | null;
  registrationNumber?: string | null;
  signatureObjectKey?: string | null;
  documentPrefs?: Partial<PrescriptionDocumentPrefs>;
}): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath("doctor/prescription-branding"), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function patchDoctorProfile(body: {
  fullName?: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  specialty?: string | null;
}): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath("doctor/profile"), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function patchClinicDetails(body: {
  name?: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  registrationNumber?: string | null;
}): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath("doctor/clinic"), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

// ── Advice templates ─────────────────────────────────────────────────────────

export async function fetchAdviceTemplates(): Promise<AdviceTemplate[]> {
  if (isDemoMode()) return [];
  return apiFetchJson<AdviceTemplate[]>(haProxyPath("doctor/advice-templates"), { method: "GET" });
}

export async function createAdviceTemplate(body: {
  title: string;
  category: "diet" | "lifestyle" | "restriction";
  content: string;
  isShared?: boolean;
}): Promise<{ id: string }> {
  if (isDemoMode()) return { id: crypto.randomUUID() };
  return apiFetchJson<{ id: string }>(haProxyPath("doctor/advice-templates"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateAdviceTemplate(id: string, body: {
  title?: string;
  category?: "diet" | "lifestyle" | "restriction";
  content?: string;
  isShared?: boolean;
}): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath(`doctor/advice-templates/${id}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteAdviceTemplate(id: string): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath(`doctor/advice-templates/${id}`), { method: "DELETE" });
}

// ── Treatment plans ──────────────────────────────────────────────────────────

export async function fetchTreatmentPlans(): Promise<TreatmentPlan[]> {
  if (isDemoMode()) return [];
  return apiFetchJson<TreatmentPlan[]>(haProxyPath("doctor/treatment-plans"), { method: "GET" });
}

export async function createTreatmentPlan(body: {
  title: string;
  description?: string | null;
  dietAdvice?: string | null;
  lifestyleAdvice?: string | null;
  restrictionAdvice?: string | null;
  remedyGuidelines?: string | null;
  linkedTemplateIds?: string[];
  isShared?: boolean;
}): Promise<{ id: string }> {
  if (isDemoMode()) return { id: crypto.randomUUID() };
  return apiFetchJson<{ id: string }>(haProxyPath("doctor/treatment-plans"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateTreatmentPlan(id: string, body: Partial<Parameters<typeof createTreatmentPlan>[0]>): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath(`doctor/treatment-plans/${id}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteTreatmentPlan(id: string): Promise<{ ok: boolean }> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson<{ ok: boolean }>(haProxyPath(`doctor/treatment-plans/${id}`), { method: "DELETE" });
}

export async function presignStorageUpload(payload: {
  category: "audio" | "document";
  filename: string;
  contentType: string;
}): Promise<{ uploadUrl: string; objectKey: string; expiresInSeconds: number }> {
  if (isDemoMode()) {
    return { uploadUrl: "", objectKey: `clinics/demo/document/${payload.filename}`, expiresInSeconds: 300 };
  }
  return apiFetchJson(haProxyPath("storage/presign-upload"), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchPresignDownload(objectKey: string): Promise<{ downloadUrl: string }> {
  if (isDemoMode()) return { downloadUrl: "" };
  const q = new URLSearchParams({ objectKey });
  return apiFetchJson<{ downloadUrl: string }>(haProxyPath(`storage/presign-download?${q.toString()}`), { method: "GET" });
}

export async function fetchDoctorInbox(limit = 20): Promise<InboxMessageItem[]> {
  if (isDemoMode()) return DEMO_INBOX.slice(0, limit);
  try {
    const data = await apiFetchJson<{ items: (InboxMessageItem & { from_doctor?: boolean })[] }>(
      haProxyPath(`doctor/inbox?limit=${encodeURIComponent(String(limit))}`),
      { method: "GET" }
    );
    const raw = data.items ?? [];
    return raw.map((m) => ({ ...m, fromDoctor: m.fromDoctor ?? m.from_doctor ?? false }));
  } catch (e) {
    if (isDemoFallback()) return DEMO_INBOX.slice(0, limit);
    throw e;
  }
}

export async function fetchDashboardRecent(): Promise<DashboardRecentItem[]> {
  if (isDemoMode()) return [...DEMO_DASHBOARD_RECENT];
  try {
    // Pull a wider window so we can reliably surface 3 *inbound* lines after filtering.
    const inbox = await fetchDoctorInbox(40);
    const fromInbox: DashboardRecentItem[] = inbox
      .filter((m) => !m.fromDoctor)
      .slice(0, 3)
      .map((m) => ({
        id: `msg-${m.id}`,
        kind: "message" as const,
        title: `Message · ${m.patientName}`,
        subtitle:
          m.body.length > 80
            ? `${m.body.replace(/\s+/g, " ").trim().slice(0, 80)}…`
            : m.body.replace(/\s+/g, " ").trim(),
        at: m.createdAt,
        href: "/messages"
      }));
    return fromInbox;
  } catch (e) {
    if (isDemoFallback()) return [...DEMO_DASHBOARD_RECENT];
    return [];
  }
}

export async function markDoctorInboxMessageRead(messageId: string): Promise<void> {
  if (isDemoMode()) return;
  await apiFetchJson<{ ok: boolean }>(haProxyPath(`doctor/inbox/${encodeURIComponent(messageId)}/read`), {
    method: "POST"
  });
}

export async function postDoctorInboxReply(payload: {
  patientId: string;
  body: string;
  inReplyToMessageId?: string;
}): Promise<{ id: string; created_at: string }> {
  if (isDemoMode()) {
    return { id: `demo-reply-${Date.now()}`, created_at: new Date().toISOString() };
  }
  return apiFetchJson<{ id: string; created_at: string }>(haProxyPath("doctor/inbox/reply"), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchMyDay(days = 7): Promise<MyDayResponse> {
  if (isDemoMode()) return buildDemoMyDay();
  try {
    const raw = await apiFetchJson<MyDayResponse & { followUps?: FollowUpQueueItem[] }>(
      haProxyPath(`doctor/my-day?days=${days}`),
      { method: "GET" }
    );
    const followUps = (raw.followUps ?? []).map((f) => ({
      ...f,
      title: f.title || f.reason || "Follow-up"
    }));
    return { ...raw, followUps };
  } catch (e) {
    if (isDemoFallback()) return buildDemoMyDay();
    throw e;
  }
}

export type PatientsListResponse = {
  items: PatientListItem[];
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string | null;
};

export async function searchPatientsLight(q: string, limit = 20): Promise<PatientListItem[]> {
  if (isDemoMode()) {
    const s = q.trim().toLowerCase();
    return DEMO_PATIENTS.filter((p) => !s || p.name.toLowerCase().includes(s)).slice(0, limit);
  }
  const qs = new URLSearchParams({ q, limit: String(limit) });
  const raw = await apiFetchJson<{ items: PatientListItem[] }>(
    haProxyPath(`doctor/patients/search?${qs}`),
    { method: "GET" }
  );
  return raw.items ?? [];
}

export async function fetchPatientsPage(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  tags?: string;
  status?: "stable" | "critical";
  cursor?: string;
  lightweight?: boolean;
  sort?: "created_at" | "last_visit_at" | "name";
  sortDir?: "asc" | "desc";
}): Promise<PatientsListResponse> {
  if (isDemoMode()) {
    let items = [...DEMO_PATIENTS];
    if (params?.search?.trim()) {
      const s = params.search.trim().toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(s));
    }
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const slice = items.slice(offset, offset + limit);
    return { items: slice, total: items.length, limit, offset };
  }
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  if (params?.tags?.trim()) qs.set("tags", params.tags.trim());
  if (params?.status) qs.set("status", params.status);
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.lightweight) qs.set("lightweight", "true");
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.sortDir) qs.set("sortDir", params.sortDir);
  const path = qs.toString() ? `doctor/patients?${qs}` : "doctor/patients";
  try {
    const raw = await apiFetchJson<PatientsListResponse | PatientListItem[]>(haProxyPath(path), {
      method: "GET"
    });
    if (Array.isArray(raw)) {
      return { items: raw, total: raw.length, limit: raw.length, offset: 0 };
    }
    return raw;
  } catch (e) {
    if (isDemoFallback()) {
      return { items: [...DEMO_PATIENTS], total: DEMO_PATIENTS.length, limit: 50, offset: 0 };
    }
    throw e;
  }
}

/** Loads up to `max` patients (paginated server-side). Prefer `fetchPatientsPage` for large clinics. */
export async function fetchPatients(max = 500): Promise<PatientListItem[]> {
  if (isDemoMode()) return [...DEMO_PATIENTS];
  const pageSize = 100;
  const all: PatientListItem[] = [];
  let offset = 0;
  while (all.length < max) {
    const page = await fetchPatientsPage({ limit: pageSize, offset });
    all.push(...page.items);
    if (page.items.length < pageSize || all.length >= page.total) break;
    offset += pageSize;
  }
  return all.slice(0, max);
}

export async function fetchFollowUpQueue(): Promise<FollowUpQueueItem[]> {
  if (isDemoMode()) {
    return buildDemoMyDay().followUps.map((it) => ({
      ...it,
      title: it.title || it.reason || "Follow-up"
    }));
  }
  try {
    const data = await apiFetchJson<{ items: FollowUpQueueItem[] }>(haProxyPath("doctor/follow-ups"), {
      method: "GET"
    });
    const items = data.items ?? [];
    return items.map((it) => ({
      ...it,
      title: it.title || (it as { reason?: string }).reason || "Follow-up"
    }));
  } catch (e) {
    if (isDemoFallback()) {
      return buildDemoMyDay().followUps.map((it) => ({
        ...it,
        title: it.title || it.reason || "Follow-up"
      }));
    }
    throw e;
  }
}

export type PatientDetail = PatientListItem & {
  lastVisitAt: string | null;
  pendingPriorOutcome?: PendingPriorOutcome | null;
  lastCaseOutcome?: LastCaseOutcome | null;
  gender?: string;
  address?: string;
  patientNotes?: string;
  /** Date of birth (ISO YYYY-MM-DD). Preferred over age. */
  dateOfBirth?: string | null;
  /** Free-text allergies / sensitivities. */
  allergies?: string;
  /** Emergency contact name. */
  emergencyContactName?: string;
  /** Emergency contact phone. */
  emergencyContactPhone?: string;
  /** Blood group label (e.g. O+, AB-). */
  bloodGroup?: string;
  /** Free-text long-term conditions / outside-Rx. */
  ongoingConditions?: string;
};

export async function fetchPatient(patientId: string): Promise<PatientDetail> {
  return apiFetchJson<PatientDetail>(haProxyPath(`doctor/patients/${encodeURIComponent(patientId)}`), { method: "GET" });
}

export async function updatePatient(
  patientId: string,
  body: Partial<{
    name: string;
    phone: string;
    languagePreference: string;
    age: number;
    dateOfBirth: string | null;
    gender: string;
    address: string;
    patientNotes: string;
    initialChiefComplaint: string;
    allergies: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    bloodGroup: string;
    ongoingConditions: string;
    tags: PatientTag[];
  }>
): Promise<PatientDetail> {
  if (isDemoMode()) {
    const cur = await fetchPatient(patientId);
    return { ...cur, ...body, lastVisitAt: cur.lastVisitAt };
  }
  return apiFetchJson<PatientDetail>(haProxyPath(`doctor/patients/${encodeURIComponent(patientId)}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export type NoteDetail = {
  chiefComplaints?: string;
  emotionalState?: string;
  timeline?: string;
  physicalSymptoms?: string;
};

export type ConsultationEvent = {
  kind: "consultation";
  id: string;
  consultationId: string;
  at: string;
  visitType: string;
  endedAt: string | null;
  hasNoteFinal: boolean;
  summary: string;
  detail?: NoteDetail | null;
};

export type PrescriptionEvent = {
  kind: "prescription";
  id: string;
  at: string;
  items: { remedy: string; code: string; dosage: string }[];
  consultationId: string | null;
};

export type FollowupEvent = {
  kind: "followup";
  id: string;
  at: string;
  dueAt: string;
  title: string;
  reason?: string;
  sourceConsultationId: string;
  overdue: boolean;
  /** Server-side status for real follow_ups; absent for synthetic post-visit suggestions. */
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";
  /** Distinguishes real follow_ups (intentional) from heuristic 14-day suggestions. */
  source?: "intentional" | "suggested";
};

export type DocumentEvent = {
  kind: "document";
  id: string;
  at: string;
  objectKey: string;
  filename: string;
};

export type CaseOutcomeEvent = {
  kind: "case_outcome";
  id: string;
  at: string;
  consultationId: string;
  outcome: CaseOutcomeValue;
  assessment?: string;
};

export type TimelineEvent =
  | ConsultationEvent
  | PrescriptionEvent
  | FollowupEvent
  | DocumentEvent
  | CaseOutcomeEvent;

export type PatientTimelineResponse = {
  events: TimelineEvent[];
  total?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
};

export async function fetchPatientTimeline(
  patientId: string,
  params?: { limit?: number; offset?: number; includeNotes?: boolean }
): Promise<PatientTimelineResponse> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  if (params?.includeNotes) qs.set("includeNotes", "true");
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetchJson<PatientTimelineResponse>(
    haProxyPath(`doctor/patients/${encodeURIComponent(patientId)}/timeline${suffix}`),
    { method: "GET" }
  );
}

export async function fetchConsultationNoteDetail(
  consultationId: string
): Promise<{ consultationId: string; detail: NoteDetail | null }> {
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/note-detail`), {
    method: "GET"
  });
}

export async function createPatient(body: {
  name: string;
  phone?: string;
  languagePreference?: string;
  age?: number;
  gender?: string;
  address?: string;
  patientNotes?: string;
  initialChiefComplaint?: string;
}): Promise<PatientListItem & { id: string }> {
  return apiFetchJson<PatientListItem & { id: string }>(haProxyPath("doctor/patients"), {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      phone: body.phone,
      languagePreference: body.languagePreference,
      age: body.age,
      gender: body.gender,
      address: body.address,
      patientNotes: body.patientNotes,
      initialChiefComplaint: body.initialChiefComplaint
    })
  });
}

export type CaseComplexity = "SIMPLE" | "STANDARD" | "COMPLEX" | "URGENT";

export async function startConsultation(
  patientId: string,
  options?: {
    type?: "INITIAL" | "FOLLOW_UP";
    complexity?: CaseComplexity;
    appointmentId?: string;
    consultationMode?: "IN_CLINIC" | "ONLINE";
  }
): Promise<{
  id: string;
  meeting?: { doctorJoinUrl: string; patientJoinUrl: string; roomId: string } | null;
}> {
  const row = await apiFetchJson<{
    id: string;
    meeting?: { doctorJoinUrl: string; patientJoinUrl: string; roomId: string } | null;
  }>(haProxyPath("doctor/consultations"), {
    method: "POST",
    body: JSON.stringify({
      patientId,
      type: options?.type ?? "INITIAL",
      recordingEnabled: options?.consultationMode === "ONLINE",
      complexity: options?.complexity ?? "STANDARD",
      appointmentId: options?.appointmentId,
      consultationMode: options?.consultationMode ?? "IN_CLINIC"
    })
  });
  return { id: row.id, meeting: row.meeting ?? null };
}

export async function createAppointment(body: {
  patientId: string;
  scheduledFor: string;
  durationMinutes?: number;
  reason?: string;
  doctorId?: string;
  consultationMode?: "IN_CLINIC" | "ONLINE";
  notifyPatient?: boolean;
}): Promise<{ id: string; scheduled_for?: string; status?: string; patient_id?: string }> {
  return apiFetchJson(haProxyPath("doctor/appointments"), {
    method: "POST",
    body: JSON.stringify({
      patientId: body.patientId,
      scheduledFor: body.scheduledFor,
      durationMinutes: body.durationMinutes ?? 30,
      reason: body.reason,
      doctorId: body.doctorId,
      consultationMode: body.consultationMode ?? "IN_CLINIC",
      notifyPatient: body.notifyPatient ?? true
    })
  });
}

export type ConsultationMeeting = {
  doctorJoinUrl: string | null;
  roomId: string | null;
  roomUrl?: string | null;
  meetingToken?: string | null;
  status?: string | null;
  videoSessionId?: string | null;
  patientWaitingSince?: string | null;
};

export type VideoSessionState = {
  videoSession: {
    id?: string;
    room_id?: string;
    room_url?: string;
    status?: string;
    patient_waiting_since?: string | null;
    doctor_joined_at?: string | null;
    patient_joined_at?: string | null;
  } | null;
  patientJoinUrl: string | null;
  appointmentId: string | null;
};

export async function fetchConsultationVideoSession(
  consultationId: string
): Promise<VideoSessionState> {
  if (isDemoMode()) {
    return { videoSession: null, patientJoinUrl: null, appointmentId: null };
  }
  return apiFetchJson<VideoSessionState>(
    haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/video-session`),
    { method: "GET" }
  );
}

export async function admitConsultationPatient(consultationId: string): Promise<{ admitted: number }> {
  if (isDemoMode()) return { admitted: 0 };
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/admit-patient`), {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function endConsultationVideo(
  consultationId: string,
  reason = "doctor_ended"
): Promise<{ ended: boolean }> {
  if (isDemoMode()) return { ended: true };
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/end-video`), {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function fetchConsultationMeeting(consultationId: string): Promise<ConsultationMeeting> {
  if (isDemoMode()) {
    return { doctorJoinUrl: null, roomId: null };
  }
  return apiFetchJson<ConsultationMeeting>(
    haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/meeting`),
    { method: "GET" }
  );
}

export async function provisionConsultationVideo(
  consultationId: string,
  recordingEnabled = false
): Promise<{
  doctorJoinUrl: string;
  patientJoinUrl: string;
  roomId: string;
  roomUrl: string;
  doctorMeetingToken: string;
}> {
  if (isDemoMode()) {
    return {
      doctorJoinUrl: "https://demo.daily.co/demo",
      patientJoinUrl: "https://example.com/join/demo",
      roomId: "demo",
      roomUrl: "https://demo.daily.co/demo",
      doctorMeetingToken: "demo-token"
    };
  }
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/provision-video`), {
    method: "POST",
    body: JSON.stringify({ recordingEnabled })
  });
}

export async function fetchConsultationRecording(
  consultationId: string
): Promise<{ url: string; objectKey: string }> {
  if (isDemoMode()) throw new Error("No recording in demo mode");
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/recording`), {
    method: "GET"
  });
}

export async function resendAppointmentInvite(appointmentId: string): Promise<{ sent: boolean }> {
  if (isDemoMode()) return { sent: true };
  return apiFetchJson(haProxyPath(`doctor/appointments/${encodeURIComponent(appointmentId)}/resend-invite`), {
    method: "POST",
    body: JSON.stringify({})
  });
}

export type PublicJoinResponse =
  | {
      mode: "live";
      patientName: string;
      doctorName: string;
      clinicName: string;
      scheduledFor: string | null;
      consultationId?: string;
      roomUrl: string;
      meetingToken: string;
      roomName: string;
      status?: string;
      recordingEnabled?: boolean;
      videoSessionId?: string | null;
    }
  | {
      mode: "scheduled";
      patientName: string;
      doctorName: string;
      clinicName: string;
      scheduledFor: string | null;
      message: string;
      consultationId?: string;
      videoSessionId?: string | null;
    };

export type PublicPrescriptionResponse = {
  patientName: string;
  consultationId: string;
  prescription: { items: unknown; created_at: string } | null;
};

/** Unauthenticated patient join link. */
export async function fetchPublicJoin(token: string): Promise<PublicJoinResponse> {
  const r = await fetch(`${API_BASE}/public/join/${encodeURIComponent(token)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(readApiError(data) ?? "Invalid or expired link");
  return parseApiData<PublicJoinResponse>(data);
}

export async function fetchPublicPrescription(token: string): Promise<PublicPrescriptionResponse> {
  const r = await fetch(`${API_BASE}/public/prescription/${encodeURIComponent(token)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(readApiError(data) ?? "Invalid or expired link");
  return parseApiData<PublicPrescriptionResponse>(data);
}

export async function postRecordingConsent(token: string): Promise<{ ok: boolean }> {
  const r = await fetch(`${API_BASE}/public/join/${encodeURIComponent(token)}/recording-consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(readApiError(data) ?? "Could not record consent");
  return parseApiData<{ ok: boolean }>(data);
}

export type DeadLetterJob = {
  id: string;
  topic: string;
  channel: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

export async function fetchDeadLetterJobs(): Promise<DeadLetterJob[]> {
  const raw = await apiFetchJson<{ jobs: DeadLetterJob[] }>(haProxyPath("doctor/ops/dead-letter-jobs"));
  return raw.jobs ?? [];
}

export async function retryDeadLetterJob(id: string): Promise<void> {
  await apiFetchJson(haProxyPath(`doctor/ops/dead-letter-jobs/${encodeURIComponent(id)}/retry`), {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function updateAppointment(
  id: string,
  body: {
    scheduledFor?: string;
    durationMinutes?: number;
    status?: "CANCELLED" | "COMPLETED" | "NO_SHOW" | "CONFIRMED" | "IN_PROGRESS";
  }
): Promise<{ id: string; status?: string }> {
  if (isDemoMode()) {
    return { id, status: body.status };
  }
  return apiFetchJson<{ id: string; status?: string }>(haProxyPath(`doctor/appointments/${encodeURIComponent(id)}`), {
    method: "PATCH",
    body: JSON.stringify({
      ...(body.scheduledFor != null ? { scheduledFor: body.scheduledFor } : {}),
      ...(body.durationMinutes != null ? { durationMinutes: body.durationMinutes } : {}),
      ...(body.status != null ? { status: body.status } : {})
    })
  });
}

export async function createIntentionalFollowUp(body: {
  patientId: string;
  dueAt: string;
  reason: string;
  consultationId?: string;
}): Promise<unknown> {
  return apiFetchJson(haProxyPath("doctor/follow-ups"), { method: "POST", body: JSON.stringify(body) });
}

export async function createFollowUp(body: {
  patientId: string;
  dueAt: string;
  reason: string;
  consultationId?: string;
}): Promise<{ id: string }> {
  if (isDemoMode()) return { id: crypto.randomUUID() };
  return apiFetchJson<{ id: string }>(haProxyPath("doctor/follow-ups"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function patchFollowUp(
  id: string,
  body: { status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED"; dueAt?: string; reason?: string }
): Promise<{ id: string; status: string; due_at: string; completed_at: string | null }> {
  if (isDemoMode()) {
    return { id, status: body.status ?? "PENDING", due_at: body.dueAt ?? new Date().toISOString(), completed_at: null };
  }
  return apiFetchJson(haProxyPath(`doctor/follow-ups/${encodeURIComponent(id)}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

/** Operational memory — quick notes & reminders (not part of clinical record). */
export type DoctorMemoKind = "note" | "reminder" | "follow_up";
export type DoctorMemoPriority = "normal" | "urgent";
export type DoctorMemoStatus = "open" | "done" | "dismissed";

export type DoctorMemo = {
  id: string;
  kind: DoctorMemoKind;
  body: string;
  dueAt: string | null;
  priority: DoctorMemoPriority;
  pinned: boolean;
  status: DoctorMemoStatus;
  patientId: string | null;
  patientName: string | null;
  consultationId: string | null;
  doctorId: string;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DoctorMemoSummary = {
  openCount: number;
  urgentCount: number;
  overdueCount: number;
  pinnedCount: number;
  dueTodayCount: number;
  topUrgent: DoctorMemo[];
  /** Priority-sorted reminders for the dashboard queue (up to 12). */
  actionQueue?: DoctorMemo[];
};

export async function fetchDoctorMemos(params?: {
  patientId?: string;
  consultationId?: string;
  status?: DoctorMemoStatus | "all";
  urgentOnly?: boolean;
  limit?: number;
}): Promise<DoctorMemo[]> {
  if (isDemoMode()) {
    const { getDemoMemos } = await import("./demo-memos");
    return getDemoMemos(params);
  }
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set("patientId", params.patientId);
  if (params?.consultationId) qs.set("consultationId", params.consultationId);
  if (params?.status) qs.set("status", params.status);
  if (params?.urgentOnly) qs.set("urgentOnly", "true");
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const raw = await apiFetchJson<{ items: DoctorMemo[] }>(
    haProxyPath(qs.toString() ? `doctor/memos?${qs}` : "doctor/memos"),
    { method: "GET" }
  );
  return raw.items ?? [];
}

export async function fetchDoctorMemoSummary(): Promise<DoctorMemoSummary> {
  if (isDemoMode()) {
    const { getDemoMemoSummary } = await import("./demo-memos");
    return getDemoMemoSummary();
  }
  return apiFetchJson<DoctorMemoSummary>(haProxyPath("doctor/memos/summary"), { method: "GET" });
}

export async function createDoctorMemo(body: {
  body: string;
  kind?: DoctorMemoKind;
  patientId?: string;
  consultationId?: string;
  dueAt?: string;
  priority?: DoctorMemoPriority;
  pinned?: boolean;
}): Promise<DoctorMemo> {
  if (isDemoMode()) {
    const { createDemoMemo } = await import("./demo-memos");
    return createDemoMemo(body);
  }
  return apiFetchJson<DoctorMemo>(haProxyPath("doctor/memos"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function patchDoctorMemo(
  id: string,
  body: {
    body?: string;
    kind?: DoctorMemoKind;
    dueAt?: string | null;
    priority?: DoctorMemoPriority;
    pinned?: boolean;
    status?: DoctorMemoStatus;
  }
): Promise<DoctorMemo> {
  if (isDemoMode()) {
    const { patchDemoMemo } = await import("./demo-memos");
    return patchDemoMemo(id, body);
  }
  return apiFetchJson<DoctorMemo>(haProxyPath(`doctor/memos/${encodeURIComponent(id)}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export type PatientDocumentItem = {
  id: string;
  objectKey: string;
  filename: string;
  consultationId: string | null;
  patientId: string | null;
  uploadedAt: string;
  uploadedBy: string;
};

export async function fetchPatientDocuments(patientId: string): Promise<PatientDocumentItem[]> {
  if (isDemoMode()) return [];
  try {
    const data = await apiFetchJson<{ items: PatientDocumentItem[] }>(
      haProxyPath(`doctor/patients/${encodeURIComponent(patientId)}/documents`),
      { method: "GET" }
    );
    return data.items ?? [];
  } catch (e) {
    if (isDemoFallback()) return [];
    throw e;
  }
}

/**
 * Records an uploaded object in `file_objects` after pushing the bytes via the presigned URL.
 * Linking by `patientId` makes the file appear in the patient documents list and timeline,
 * even when no consultation context is available.
 */
export async function recordUploadedFile(body: {
  objectKey: string;
  category: "audio" | "document";
  consultationId?: string;
  patientId?: string;
}): Promise<{ id: string; object_key: string }> {
  if (isDemoMode()) {
    return { id: `demo-file-${Date.now()}`, object_key: body.objectKey };
  }
  return apiFetchJson(haProxyPath("storage/complete-upload"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function recordCaseOutcome(body: {
  consultationId: string;
  patientId: string;
  outcome: "CURE" | "IMPROVEMENT" | "PALLIATION" | "NO_CHANGE" | "WORSE";
  assessment?: string;
}): Promise<unknown> {
  return apiFetchJson(haProxyPath("doctor/case-outcomes"), { method: "POST", body: JSON.stringify(body) });
}

export type ConsultationLifecycle = "DRAFT" | "ACTIVE" | "REVIEWING" | "FINALIZED";

export type ConsultationClinicalRecord = {
  labs?: Array<{ id: string; testName: string; result: string; notes: string }>;
  clinicalNotes?: { observations: string; diagnosisThinking: string };
  history?: {
    pastDiseases?: string;
    medications?: string;
    familyHistory?: string;
    drugAllergies?: string;
  };
  vitals?: {
    bp?: string;
    pulse?: string;
    temperature?: string;
    spO2?: string;
    weight?: string;
    height?: string;
    respiratoryRate?: string;
  };
  advice?: Array<{
    id: string;
    category: "diet" | "lifestyle" | "restriction";
    title: string;
    detail: string;
  }>;
};

export type ConsultationPrescriptionRow = {
  id: string;
  items: unknown;
  createdAt: string;
};

export type ConsultationDetail = {
  id: string;
  patientId: string;
  patientCode?: string | null;
  visitCode?: string | null;
  patientName: string;
  /** Prior completed visit, same patient, excluding this consultation (if any). */
  lastVisitAt?: string | null;
  /** Most recent ended visit without a documented outcome (if any). */
  pendingPriorOutcome?: PendingPriorOutcome | null;
  lastCaseOutcome?: LastCaseOutcome | null;
  patientAge?: number | null;
  patientGender?: string | null;
  patientAddress?: string | null;
  patientPhone?: string | null;
  patientNotes?: string | null;
  patientInitialComplaint?: string | null;
  patientAllergies?: string | null;
  patientBloodGroup?: string | null;
  patientOngoingConditions?: string | null;
  type: string;
  recordingEnabled: boolean;
  startedAt: string;
  endedAt: string | null;
  transcriptText?: string | null;
  transcriptConfidence?: number | null;
  noteDraft: unknown;
  noteFinal: unknown;
  complexity?: string;
  appointmentId?: string | null;
  lifecycleStatus?: ConsultationLifecycle;
  clinicalRecord?: ConsultationClinicalRecord;
  clinicalRecordVersion?: number;
  advice?: { diet: string; lifestyle: string };
  followUpRecommendedAt?: string | null;
  followUpNote?: string | null;
  symptomsToMonitor?: string[];
  editingLocked?: boolean;
  finalizedAt?: string | null;
  prescription?: ConsultationPrescriptionRow | null;
  consultationMode?: "IN_CLINIC" | "ONLINE";
};

export async function fetchConsultation(id: string): Promise<ConsultationDetail> {
  if (isDemoMode()) {
    const p = DEMO_PATIENTS[0]!;
    return {
      id,
      patientId: p.id,
      patientName: p.name,
      patientAge: p.age ?? null,
      patientPhone: p.phone ?? null,
      type: "INITIAL",
      recordingEnabled: false,
      startedAt: new Date().toISOString(),
      endedAt: null,
      noteDraft: {},
      noteFinal: null,
      complexity: "STANDARD",
      consultationMode: "IN_CLINIC",
      lifecycleStatus: "ACTIVE",
      advice: { diet: "", lifestyle: "" },
      followUpRecommendedAt: null,
      followUpNote: null,
      prescription: null
    };
  }
  return apiFetchJson<ConsultationDetail>(haProxyPath(`doctor/consultations/${encodeURIComponent(id)}`), { method: "GET" });
}

export async function patchConsultation(
  consultationId: string,
  body: {
    lifecycleStatus?: ConsultationLifecycle;
    consultationMode?: "IN_CLINIC" | "ONLINE";
    noteDraft?: {
      chiefComplaints?: string;
      emotionalState?: string;
      physicalSymptoms?: string;
      modalities?: string;
      timeline?: string;
      needsReview?: boolean;
    };
    clinicalRecord?: ConsultationClinicalRecord;
    advice?: { diet: string; lifestyle: string };
    followUpRecommendedAt?: string | null;
    followUpNote?: string | null;
    symptomsToMonitor?: string[];
  }
): Promise<unknown> {
  if (isDemoMode()) return { ok: true };
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}`), {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function patchPrescription(prescriptionId: string, items: unknown[]): Promise<{ id: string }> {
  if (isDemoMode()) return { id: prescriptionId };
  return apiFetchJson<{ id: string }>(haProxyPath(`doctor/prescriptions/${encodeURIComponent(prescriptionId)}`), {
    method: "PATCH",
    body: JSON.stringify({ items })
  });
}

export async function createPrescription(body: {
  patientId: string;
  consultationId: string;
  items: unknown[];
}): Promise<{ id: string }> {
  if (isDemoMode()) return { id: "demo-rx" };
  return apiFetchJson<{ id: string }>(haProxyPath("doctor/prescriptions"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export type DistributionChannelStatus = "sent" | "queued" | "skipped" | "failed";

export type PrescriptionDistributionResult = {
  mediaObjectId: string | null;
  pdfReady: boolean;
  mimeType: string;
  storageKey: string | null;
  downloadUrl: string | null;
  email: DistributionChannelStatus;
  whatsapp: DistributionChannelStatus;
  emailDetail?: string;
  whatsappDetail?: string;
};

export type PrescriptionDistributeOptions = {
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
  notifyEmail?: string | null;
};

export async function completeConsultation(
  consultationId: string,
  options?: {
    finalize?: boolean;
    lockEditing?: boolean;
    followUpRecommendedAt?: string | null;
    followUpNote?: string | null;
    symptomsToMonitor?: string[];
    createFollowUp?: { dueAt: string; reason: string; symptomsToMonitor?: string[] };
    distribute?: PrescriptionDistributeOptions;
  }
): Promise<{ ok: boolean; alreadyEnded?: boolean; distribution?: PrescriptionDistributionResult | null }> {
  if (isDemoMode()) {
    return { ok: true, alreadyEnded: false, distribution: null };
  }
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/complete`), {
    method: "POST",
    body: JSON.stringify(options ?? {})
  });
}

export async function fetchPrescriptionDownloadUrl(
  consultationId: string
): Promise<{ downloadUrl: string; expiresInSeconds: number; mimeType: string }> {
  return apiFetchJson(
    haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/prescription-download`),
    { method: "GET" }
  );
}

export function isLocalCalendarToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// ─── WhatsApp Business ─────────────────────────────────────────────────────

export type WhatsAppConnectionStatus = {
  status: string;
  connected: boolean;
  provider?: string;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  displayPhone?: string | null;
  accessTokenMasked?: string | null;
  verifiedAt?: string | null;
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  meta_template_name: string | null;
  language_code: string;
  category: string;
  body: string;
  variables: string[];
  status: string;
};

export type WhatsAppAudienceSpec =
  | { mode: "all" }
  | { mode: "individual"; patientIds: string[] }
  | { mode: "tags"; tags: string[] }
  | { mode: "filter"; filter?: { status?: "stable" | "critical"; tags?: string[]; hasPhone?: boolean; search?: string } };

export type WhatsAppOAuthConfig = {
  enabled: boolean;
  appId: string | null;
  configId: string | null;
};

export async function fetchWhatsAppOAuthConfig(): Promise<WhatsAppOAuthConfig> {
  return apiFetchJson<WhatsAppOAuthConfig>(haProxyPath("doctor/whatsapp/oauth/config"), { method: "GET" });
}

export async function exchangeWhatsAppOAuthCode(body: {
  code: string;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  redirectUri?: string | null;
}): Promise<{ connected: boolean; displayPhone?: string; phoneNumberId?: string }> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/oauth/exchange"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function fetchWhatsAppConnection(): Promise<WhatsAppConnectionStatus> {
  return apiFetchJson<WhatsAppConnectionStatus>(haProxyPath("doctor/whatsapp/connection"), { method: "GET" });
}

export async function saveWhatsAppConnection(body: {
  wabaId?: string;
  phoneNumberId: string;
  displayPhone?: string;
  accessToken: string;
}): Promise<{ connected: boolean; displayPhone?: string }> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/connection"), {
    method: "POST",
    body: JSON.stringify({ ...body, provider: "meta_cloud" })
  });
}

export async function verifyWhatsAppConnection(testPhone: string): Promise<{ sent: boolean }> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/connection/verify"), {
    method: "POST",
    body: JSON.stringify({ testPhone })
  });
}

export async function disconnectWhatsApp(): Promise<void> {
  await apiFetchJson(haProxyPath("doctor/whatsapp/connection"), { method: "DELETE" });
}

export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  return apiFetchJson<WhatsAppTemplate[]>(haProxyPath("doctor/whatsapp/templates"), { method: "GET" });
}

export async function syncWhatsAppTemplates(): Promise<{
  synced: number;
  created: number;
  updated: number;
  skipped: number;
}> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/templates/sync"), { method: "POST" });
}

export async function createWhatsAppTemplate(body: {
  name: string;
  body: string;
  metaTemplateName?: string;
  category?: "MARKETING" | "UTILITY" | "AUTHENTICATION";
}): Promise<{ id: string }> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/templates"), {
    method: "POST",
    body: JSON.stringify({ ...body, languageCode: "en", status: "approved" })
  });
}

export async function previewWhatsAppAudience(audience: WhatsAppAudienceSpec): Promise<{
  recipientCount: number;
  skippedNoPhone: number;
}> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/audience/preview"), {
    method: "POST",
    body: JSON.stringify({ audience })
  });
}

export async function createWhatsAppBroadcast(body: {
  body: string;
  audience: WhatsAppAudienceSpec;
  templateId?: string;
}): Promise<{ broadcastId: string; total: number; skippedNoPhone: number }> {
  return apiFetchJson(haProxyPath("doctor/whatsapp/broadcasts"), {
    method: "POST",
    body: JSON.stringify(body)
  });
}
