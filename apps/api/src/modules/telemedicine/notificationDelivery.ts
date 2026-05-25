import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationJobRow } from "../distribution/types";
import { sendPrescriptionEmail } from "../distribution/notificationProviders";
import { loadDoctorWhatsAppConnection, sendWhatsAppMessage } from "../whatsapp/sendMessage";
import { markAppointmentReminderSent } from "./appointmentReminders";
import type { NotificationTemplateVars } from "./types";
import { resolveTelemedicineWhatsAppSend } from "./telemedicineWhatsApp";

function templateVarsFromPayload(payload: Record<string, unknown>): NotificationTemplateVars | null {
  const raw = payload.templateVars;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.patientName !== "string") return null;
  return {
    patientName: o.patientName,
    doctorName: String(o.doctorName ?? "Doctor"),
    clinicName: String(o.clinicName ?? "Clinic"),
    appointmentDate: o.appointmentDate != null ? String(o.appointmentDate) : undefined,
    appointmentTime: o.appointmentTime != null ? String(o.appointmentTime) : undefined,
    meetingLink: o.meetingLink != null ? String(o.meetingLink) : undefined,
    prescriptionLink: o.prescriptionLink != null ? String(o.prescriptionLink) : undefined,
    consultationSummary: o.consultationSummary != null ? String(o.consultationSummary) : undefined
  };
}

export async function processTelemedicineNotificationJob(
  admin: SupabaseClient,
  job: NotificationJobRow
): Promise<boolean> {
  const payload = job.payload ?? {};
  const topic = job.topic;

  if (topic === "appointment_invite_email" && job.channel === "email") {
    const result = await sendPrescriptionEmail({
      to: String(payload.to ?? ""),
      subject: String(payload.subject ?? "Appointment"),
      html: String(payload.html ?? ""),
      text: String(payload.text ?? "")
    });
    return result.ok;
  }

  if (topic === "consultation_summary_email" && job.channel === "email") {
    const result = await sendPrescriptionEmail({
      to: String(payload.to ?? ""),
      subject: String(payload.subject ?? "Summary"),
      html: String(payload.html ?? ""),
      text: String(payload.text ?? "")
    });
    return result.ok;
  }

  if (
    (topic === "appointment_invite_whatsapp" ||
      topic === "appointment_reminder_whatsapp" ||
      topic === "consultation_summary_whatsapp") &&
    job.channel === "whatsapp"
  ) {
    const doctorId = typeof payload.doctorId === "string" ? payload.doctorId : null;
    const conn =
      doctorId != null ? await loadDoctorWhatsAppConnection(admin, job.clinic_id, doctorId) : null;
    const fallbackBody = String(payload.body ?? "");
    const vars = templateVarsFromPayload(payload);
    const sendOpts = vars
      ? await resolveTelemedicineWhatsAppSend(admin, {
          clinicId: job.clinic_id,
          doctorId,
          topic,
          vars,
          fallbackBody
        })
      : { body: fallbackBody };

    const result = await sendWhatsAppMessage({
      connection: conn,
      toPhone: String(payload.phone ?? ""),
      body: sendOpts.body,
      metaTemplateName: sendOpts.metaTemplateName,
      languageCode: sendOpts.languageCode,
      templateParameters: sendOpts.templateParameters
    });
    if (topic === "appointment_reminder_whatsapp" && result.ok) {
      const aptId = typeof payload.appointmentId === "string" ? payload.appointmentId : "";
      const window = payload.window === "1h" ? "1h" : "24h";
      if (aptId) await markAppointmentReminderSent(admin, aptId, window);
    }
    return result.ok;
  }

  return false;
}
