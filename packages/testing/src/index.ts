/**
 * Shared test fixtures and builders for API + web Vitest suites.
 */

export type TestPatient = {
  id: string;
  name: string;
  phone: string;
  clinicId: string;
};

export const TEST_CLINIC_ID = "11111111-1111-1111-1111-111111111101";
export const TEST_PATIENT_ID = "22222222-2222-2222-2222-222222222201";
export const TEST_DOCTOR_ID = "33333333-3333-3333-3333-333333333301";

export function buildTestPatient(overrides: Partial<TestPatient> = {}): TestPatient {
  return {
    id: TEST_PATIENT_ID,
    name: "Test Patient",
    phone: "+919876543210",
    clinicId: TEST_CLINIC_ID,
    ...overrides
  };
}

/** Minimal consultation snapshot for web validation tests. */
export function emptyConsultationSnapshot(): {
  patient: { initialChiefComplaint: string; storedChiefComplaint: string | null };
  history: { pastDiseases: string; medications: string; familyHistory: string; drugAllergies: string };
  vitals: { bp: string; pulse: string; temperature: string; spO2: string };
  labs: Array<{ testName: string; result: string }>;
  observations: string;
  notes: {
    chiefComplaints: string;
    emotionalState: string;
    physicalSymptoms: string;
    modalities: string;
    timeline: string;
  };
  prescription: Array<{ name: string }>;
  advice: { diet: string; lifestyle: string; cards: [] };
  analysis: { rubrics: any[] };
  followUp: { enabled: boolean; recommendedAt: string | null };
  finalize: { sessionEnded: boolean; lifecycleStatus: string };
  aiTranscript: string;
} {
  return {
    patient: { initialChiefComplaint: "", storedChiefComplaint: null },
    history: { pastDiseases: "", medications: "", familyHistory: "", drugAllergies: "" },
    vitals: { bp: "", pulse: "", temperature: "", spO2: "" },
    labs: [],
    observations: "",
    notes: {
      chiefComplaints: "",
      emotionalState: "",
      physicalSymptoms: "",
      modalities: "",
      timeline: ""
    },
    prescription: [{ name: "" }],
    advice: { diet: "", lifestyle: "", cards: [] },
    analysis: { rubrics: [] },
    followUp: { enabled: false, recommendedAt: null },
    finalize: { sessionEnded: false, lifecycleStatus: "ACTIVE" },
    aiTranscript: ""
  };
}

export function hasSupabaseTestEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function hasRedisTestEnv(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}
