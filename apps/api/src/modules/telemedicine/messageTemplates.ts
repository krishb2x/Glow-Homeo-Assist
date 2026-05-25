import type { NotificationTemplateVars } from "./types";

function applyVars(template: string, v: NotificationTemplateVars): string {
  const map: Record<string, string> = {
    patient_name: v.patientName,
    doctor_name: v.doctorName,
    clinic_name: v.clinicName,
    appointment_date: v.appointmentDate ?? "",
    appointment_time: v.appointmentTime ?? "",
    meeting_link: v.meetingLink ?? "",
    prescription_link: v.prescriptionLink ?? "",
    followup_date: v.followupDate ?? "",
    consultation_summary: v.consultationSummary ?? ""
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => map[key.toLowerCase()] ?? "");
}

const DEFAULT_APPOINTMENT_INVITE_WHATSAPP =
  "Hello {{patient_name}}, your online consultation with {{doctor_name}} at {{clinic_name}} is scheduled for {{appointment_date}} at {{appointment_time}}.\n\nJoin here: {{meeting_link}}\n\nPlease join 5 minutes early from a quiet place.";

const DEFAULT_APPOINTMENT_INVITE_EMAIL_SUBJECT =
  "Online consultation — {{clinic_name}} on {{appointment_date}}";

const DEFAULT_APPOINTMENT_INVITE_EMAIL_HTML = `
<p>Dear {{patient_name}},</p>
<p>Your <strong>online consultation</strong> with <strong>{{doctor_name}}</strong> at {{clinic_name}} is confirmed.</p>
<p><strong>Date:</strong> {{appointment_date}}<br/><strong>Time:</strong> {{appointment_time}}</p>
<p><a href="{{meeting_link}}">Join video consultation</a></p>
<p>Works on mobile and desktop. Join 5 minutes before your slot.</p>
<p>— {{clinic_name}}</p>`;

const DEFAULT_REMINDER_WHATSAPP =
  "Reminder: online consultation with {{doctor_name}} ({{clinic_name}}) at {{appointment_time}} on {{appointment_date}}.\nJoin: {{meeting_link}}";

const DEFAULT_PRESCRIPTION_WHATSAPP =
  "Hello {{patient_name}}, your prescription from {{doctor_name}} ({{clinic_name}}) is ready.\n{{prescription_link}}";

const DEFAULT_SUMMARY_WHATSAPP =
  "Hello {{patient_name}}, thank you for your consultation with {{doctor_name}} at {{clinic_name}}.\n{{consultation_summary}}\nPrescription: {{prescription_link}}";

export function appointmentInviteWhatsApp(v: NotificationTemplateVars): string {
  const raw = process.env.TEMPLATE_APPOINTMENT_INVITE_WHATSAPP?.trim() || DEFAULT_APPOINTMENT_INVITE_WHATSAPP;
  return applyVars(raw, v);
}

export function appointmentInviteEmail(v: NotificationTemplateVars): { subject: string; html: string; text: string } {
  const subject = applyVars(
    process.env.TEMPLATE_APPOINTMENT_INVITE_EMAIL_SUBJECT?.trim() || DEFAULT_APPOINTMENT_INVITE_EMAIL_SUBJECT,
    v
  );
  const html = applyVars(
    process.env.TEMPLATE_APPOINTMENT_INVITE_EMAIL_HTML?.trim() || DEFAULT_APPOINTMENT_INVITE_EMAIL_HTML,
    v
  );
  const text = `Dear ${v.patientName}, your online consultation with ${v.doctorName} at ${v.clinicName} is on ${v.appointmentDate} at ${v.appointmentTime}. Join: ${v.meetingLink}`;
  return { subject, html, text };
}

export function appointmentReminderWhatsApp(v: NotificationTemplateVars): string {
  const raw = process.env.TEMPLATE_APPOINTMENT_REMINDER_WHATSAPP?.trim() || DEFAULT_REMINDER_WHATSAPP;
  return applyVars(raw, v);
}

export function prescriptionWhatsApp(v: NotificationTemplateVars): string {
  const raw = process.env.TEMPLATE_PRESCRIPTION_WHATSAPP?.trim() || DEFAULT_PRESCRIPTION_WHATSAPP;
  return applyVars(raw, v);
}

export function consultationSummaryWhatsApp(v: NotificationTemplateVars): string {
  const raw = process.env.TEMPLATE_CONSULTATION_SUMMARY_WHATSAPP?.trim() || DEFAULT_SUMMARY_WHATSAPP;
  return applyVars(raw, v);
}

export function formatAppointmentDateTime(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    };
  } catch {
    return { date: iso, time: "" };
  }
}
