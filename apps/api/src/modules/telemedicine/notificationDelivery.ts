import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationJobRow } from "../distribution/types";

import { markAppointmentReminderSent } from "./appointmentReminders";

import type { NotificationTemplateVars } from "./types";

import { resolveTelemedicineWhatsAppSend } from "./telemedicineWhatsApp";

import { loadClinicWhatsAppConnection, sendWhatsAppMessage } from "../whatsapp/sendMessage";

import { deliverQueuedEmail, persistEmailProviderMessageId } from "./emailDelivery";



const EMAIL_TOPICS = new Set([

  "appointment_invite_email",

  "appointment_reminder_email",

  "prescription_delivery_email",

  "consultation_summary_email",

  "consultation_missed_email",

  "follow_up_reminder_email"

]);



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

    consultationSummary: o.consultationSummary != null ? String(o.consultationSummary) : undefined,

    followupDate: o.followupDate != null ? String(o.followupDate) : undefined

  };

}



export async function processTelemedicineNotificationJob(

  admin: SupabaseClient,

  job: NotificationJobRow

): Promise<boolean> {

  const payload = job.payload ?? {};

  const topic = job.topic;



  if (EMAIL_TOPICS.has(topic) && job.channel === "email") {

    const result = await deliverQueuedEmail(job, payload);

    if (result.ok) {

      await persistEmailProviderMessageId(admin, job, result.messageId);

    }

    if (topic === "appointment_reminder_email" && result.ok) {

      const aptId = typeof payload.appointmentId === "string" ? payload.appointmentId : "";

      const window = payload.window === "1h" ? "1h" : "24h";

      if (aptId) await markAppointmentReminderSent(admin, aptId, window);

    }

    return result.ok;

  }



  if (

    (topic === "appointment_invite_whatsapp" ||

      topic === "appointment_reminder_whatsapp" ||

      topic === "consultation_summary_whatsapp" ||

      topic === "consultation_ready_whatsapp" ||

      topic === "consultation_missed_whatsapp") &&

    job.channel === "whatsapp"

  ) {

    const doctorId = typeof payload.doctorId === "string" ? payload.doctorId : null;

    const conn = await loadClinicWhatsAppConnection(admin, job.clinic_id, "AUTOMATED");

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

      templateParameters: sendOpts.templateParameters,

      channelType: "AUTOMATED"

    });

    if (topic === "appointment_reminder_whatsapp" && result.ok) {

      const aptId = typeof payload.appointmentId === "string" ? payload.appointmentId : "";

      const window = payload.window === "1h" ? "1h" : "24h";

      if (aptId) await markAppointmentReminderSent(admin, aptId, window);

    }

    return result.ok;

  }



  if (topic === "follow_up_reminder" && job.channel === "whatsapp") {

    const doctorId = typeof payload.doctorId === "string" ? payload.doctorId : null;

    const conn = await loadClinicWhatsAppConnection(admin, job.clinic_id, "AUTOMATED");

    const result = await sendWhatsAppMessage({

      connection: conn,

      toPhone: String(payload.phone ?? ""),

      body: String(payload.body ?? ""),

      channelType: "AUTOMATED"

    });

    return result.ok;

  }



  return false;

}


