/** Doctor-controlled layout toggles for PDF / print (from profile). */
export type RxDocumentPrefs = {
  showClinicDetails: boolean;
  showSignature: boolean;
  showRegistrationNumber: boolean;
};

/** Patient copy visibility toggles. */
export type PatientSlipPrefs = {
  showSymptoms: boolean;
  showNotes: boolean;
  showInstructions: boolean;
};

export type RxLine = {
  medicine: string;
  kind: "remedy" | "medicine";
  potency: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
  /** Composed sig line for print (dose + timing + instructions). */
  sig: string;
};

export type NoteBlock = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

export type RxDocumentMeta = {
  clinicName: string;
  clinicAddressLine?: string | null;
  clinicPhone?: string | null;
  clinicEmail?: string | null;
  logoUrl?: string | null;
  doctorName: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  consultationId: string;
  visitDateLabel: string;
  consultationModeLabel?: string | null;
  patientName: string;
  patientAge: number | null;
  patientGender?: string | null;
  patientCode?: string | null;
  /** Human-readable visit reference (e.g. GH-NHC-V202605-0042). */
  visitCode?: string | null;
  followUpNote?: string | null;
  symptomsToMonitor?: string[] | null;
  doctorSignatureLine?: string;
  followUpDateLabel?: string | null;
  signatureImageUrl?: string | null;
  /** Patient app / verify URL — renders QR when set. */
  qrUrl?: string | null;
  documentPrefs: RxDocumentPrefs;
};

export type DoctorChartExtras = {
  labs?: Array<{ testName: string; result: string; notes: string }>;
  history?: { pastDiseases: string; medications: string };
  clinicalNotes?: { observations: string; diagnosisThinking: string };
};

export type BuildPrescriptionSlipOptions = {
  meta: RxDocumentMeta;
  lines: RxLine[];
  advice: { diet: string; lifestyle: string };
  notes?: NoteBlock;
  patientPrefs?: PatientSlipPrefs;
};

export type BuildClinicalSummaryOptions = {
  meta: RxDocumentMeta;
  lines: RxLine[];
  notes: NoteBlock;
  advice: { diet: string; lifestyle: string };
  extras?: DoctorChartExtras;
};
