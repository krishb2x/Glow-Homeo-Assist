import type { Role } from "@homeoassist/domain";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  clinicId: string | null;
  displayName: string;
};

export type ClinicRecord = {
  id: string;
  name: string;
  isActive: boolean;
  region: "IN";
  whatsappEnabled: boolean;
};

export type OnboardingRecord = {
  id: string;
  doctorName: string;
  email: string;
  degreeDocumentUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "PROVISIONED";
  reviewedByUserId?: string;
  clinicId?: string;
};

export type PatientRecord = {
  id: string;
  clinicId: string;
  name: string;
  phone?: string;
  languagePreference?: string;
};

export type ConsultationRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  type: "INITIAL" | "FOLLOW_UP";
  startedAt: string;
  endedAt?: string;
  recordingEnabled: boolean;
  transcriptText?: string;
  transcriptConfidence?: number;
  transcriptLanguage?: string;
  noteDraft?: {
    chiefComplaints: string;
    emotionalState: string;
    physicalSymptoms: string;
    timeline: string;
    needsReview: boolean;
  };
  noteFinal?: {
    chiefComplaints: string;
    emotionalState: string;
    physicalSymptoms: string;
    timeline: string;
    finalizedBy: string;
    finalizedAt: string;
  };
};

export type PrescriptionRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  consultationId: string;
  items: Array<{
    doctorVisibleRemedy: string;
    patientVisibleCode: string;
    dosageInstruction: string;
  }>;
};

export type ReminderRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  dueAt: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  channel: "IN_APP" | "WHATSAPP";
  idempotencyKey: string;
  retries: number;
};

export type SubscriptionRecord = {
  id: string;
  clinicId: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "PAUSED";
  updatedAt: string;
};

export type SupportTicketRecord = {
  id: string;
  clinicId: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdByUserId: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  requestedAt: string;
  scheduledFor: string;
  status: "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
};

export type PatientPreferenceRecord = {
  patientId: string;
  clinicId: string;
  reminderInApp: boolean;
  reminderWhatsApp: boolean;
};

export const db = {
  users: [] as UserRecord[],
  clinics: [] as ClinicRecord[],
  onboarding: [] as OnboardingRecord[],
  patients: [] as PatientRecord[],
  consultations: [] as ConsultationRecord[],
  prescriptions: [] as PrescriptionRecord[],
  reminders: [] as ReminderRecord[],
  subscriptions: [] as SubscriptionRecord[],
  supportTickets: [] as SupportTicketRecord[],
  appointments: [] as AppointmentRecord[],
  patientPreferences: [] as PatientPreferenceRecord[],
  audit: [] as Array<Record<string, string>>
};
