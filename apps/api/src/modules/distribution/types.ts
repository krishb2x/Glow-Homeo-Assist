export type DistributionChannelStatus = "sent" | "queued" | "skipped" | "failed";

export type PrescriptionDistributionOptions = {
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
  /** Override when patient record has no email yet. */
  notifyEmail?: string | null;
};

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

export type NotificationJobRow = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  channel: string;
  topic: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  scheduled_for: string;
  status: string;
  attempts: number;
};
