export type NotificationTemplateVars = {
  patientName: string;
  doctorName: string;
  clinicName: string;
  appointmentDate?: string;
  appointmentTime?: string;
  meetingLink?: string;
  prescriptionLink?: string;
  followupDate?: string;
  consultationSummary?: string;
};

export type PatientAccessPurpose =
  | "join_consultation"
  | "view_prescription"
  | "view_report"
  | "family_view"
  | "patient_login";
