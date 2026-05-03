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

function apiPath(path: string): string {
  if (path.startsWith("/")) path = path.slice(1);
  return `${API_BASE}/${path}`;
}

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
  aiNotetaker: boolean;
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
      features: { planTier: "PRO", aiNotetaker: true, messages: true, whatsappIntegration: false },
      overrides: [],
      planDefaults: { BASIC: ["messages"], PRO: ["messages", "ai_notetaker"], ENTERPRISE: ["messages", "ai_notetaker", "whatsapp_integration"] }
    };
  }
  return apiFetchJson<AdminClinicFeaturesResponse>(haProxyPath(`admin/clinics/${encodeURIComponent(clinicId)}/features`), { method: "GET" });
}

export async function patchAdminClinicFeatures(
  clinicId: string,
  body: { planTier?: PlanTier; overrides?: Record<string, boolean> }
): Promise<{ planTier: PlanTier; features: ClinicFeatures }> {
  if (isDemoMode()) {
    return { planTier: body.planTier ?? "PRO", features: { planTier: body.planTier ?? "PRO", aiNotetaker: true, messages: true, whatsappIntegration: false } };
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
      };
      return {
        id: a.id,
        scheduledFor: a.scheduled_for,
        durationMinutes: a.duration_minutes,
        status: a.status,
        patientId: a.patient_id,
        patientName: a.patientName ?? "Patient",
        reason: a.reason
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
  /** When set, schedule UI uses this; otherwise it is derived from reason + patient tags. */
  displayTag?: PatientTag;
};

export type ActiveConsultationRow = {
  id: string;
  patientId: string;
  patientName: string;
  startedAt: string;
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

export async function fetchPatients(): Promise<PatientListItem[]> {
  if (isDemoMode()) return [...DEMO_PATIENTS];
  try {
    return await apiFetchJson<PatientListItem[]>(haProxyPath("doctor/patients"), { method: "GET" });
  } catch (e) {
    if (isDemoFallback()) return [...DEMO_PATIENTS];
    throw e;
  }
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

export type TimelineEvent = ConsultationEvent | PrescriptionEvent | FollowupEvent | DocumentEvent;

export type PatientTimelineResponse = { events: TimelineEvent[] };

export async function fetchPatientTimeline(patientId: string): Promise<PatientTimelineResponse> {
  return apiFetchJson<PatientTimelineResponse>(haProxyPath(`doctor/patients/${encodeURIComponent(patientId)}/timeline`), {
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
): Promise<{ id: string }> {
  const row = await apiFetchJson<{ id: string }>(haProxyPath("doctor/consultations"), {
    method: "POST",
    body: JSON.stringify({
      patientId,
      type: options?.type ?? "INITIAL",
      recordingEnabled: false,
      complexity: options?.complexity ?? "STANDARD",
      appointmentId: options?.appointmentId,
      consultationMode: options?.consultationMode ?? "IN_CLINIC"
    })
  });
  return { id: row.id };
}

export async function createAppointment(body: {
  patientId: string;
  scheduledFor: string;
  durationMinutes?: number;
  reason?: string;
  doctorId?: string;
}): Promise<{ id: string; scheduled_for?: string; status?: string; patient_id?: string }> {
  return apiFetchJson(haProxyPath("doctor/appointments"), {
    method: "POST",
    body: JSON.stringify({
      patientId: body.patientId,
      scheduledFor: body.scheduledFor,
      durationMinutes: body.durationMinutes ?? 30,
      reason: body.reason,
      doctorId: body.doctorId
    })
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
  history?: { pastDiseases: string; medications: string };
};

export type ConsultationPrescriptionRow = {
  id: string;
  items: unknown;
  createdAt: string;
};

export type ConsultationDetail = {
  id: string;
  patientId: string;
  patientName: string;
  /** Prior completed visit, same patient, excluding this consultation (if any). */
  lastVisitAt?: string | null;
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

export async function completeConsultation(
  consultationId: string,
  options?: {
    finalize?: boolean;
    lockEditing?: boolean;
    followUpRecommendedAt?: string | null;
    followUpNote?: string | null;
    createFollowUp?: { dueAt: string; reason: string };
  }
): Promise<{ ok: boolean; alreadyEnded?: boolean }> {
  if (isDemoMode()) {
    return { ok: true, alreadyEnded: false };
  }
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/complete`), {
    method: "POST",
    body: JSON.stringify(options ?? {})
  });
}

export function isLocalCalendarToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function getWebSocketBaseUrl(): string {
  const w = process.env.NEXT_PUBLIC_WS_URL;
  if (typeof w === "string" && w.length > 0) {
    return w.replace(/\/$/, "");
  }
  const h = new URL(API_BASE);
  h.protocol = h.protocol === "https:" ? "wss:" : "ws:";
  return h.origin;
}

export function buildConsultationWebSocketUrl(accessToken: string): string {
  return `${getWebSocketBaseUrl()}/ws/consultation?access_token=${encodeURIComponent(accessToken)}`;
}

export async function fetchClinicPrivacyDefaults(): Promise<{ defaultSaveAudio: boolean }> {
  const d = await apiFetchJson<{ defaultSaveAudio: boolean }>(haProxyPath("doctor/clinic/privacy"), { method: "GET" });
  return { defaultSaveAudio: Boolean(d.defaultSaveAudio) };
}

export async function finalizeConsultationRecording(
  consultationId: string,
  saveAudio: boolean
): Promise<unknown> {
  return apiFetchJson(haProxyPath(`doctor/consultations/${encodeURIComponent(consultationId)}/finalize`), {
    method: "POST",
    body: JSON.stringify({ saveAudio })
  });
}
