import { buildTransactionalEmail } from "../distribution/emailLayout";
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

const DEFAULT_INCLINIC_INVITE_EMAIL_SUBJECT = "Clinic visit confirmed — {{clinic_name}} on {{appointment_date}}";

const DEFAULT_APPOINTMENT_REMINDER_EMAIL_SUBJECT =
  "Reminder: consultation on {{appointment_date}} at {{appointment_time}}";

const DEFAULT_PRESCRIPTION_EMAIL_SUBJECT = "Your prescription from {{doctor_name}} — {{clinic_name}}";

const DEFAULT_SUMMARY_EMAIL_SUBJECT = "Consultation summary — {{clinic_name}}";

const DEFAULT_MISSED_EMAIL_SUBJECT = "Missed consultation — {{clinic_name}}";

const DEFAULT_FOLLOWUP_EMAIL_SUBJECT = "Follow-up reminder — {{clinic_name}}";

export type EmailPayload = { subject: string; html: string; text: string };

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${text}</p>`;
}

function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#374151;"><strong>${label}:</strong> ${value}</p>`;
}

export function appointmentInviteWhatsApp(v: NotificationTemplateVars): string {
  const raw = process.env.TEMPLATE_APPOINTMENT_INVITE_WHATSAPP?.trim() || DEFAULT_APPOINTMENT_INVITE_WHATSAPP;
  return applyVars(raw, v);
}

export function appointmentInviteEmail(v: NotificationTemplateVars, mode: "ONLINE" | "IN_CLINIC" = "ONLINE"): EmailPayload {
  const isOnline = mode === "ONLINE";
  const subject = applyVars(
    isOnline
      ? process.env.TEMPLATE_APPOINTMENT_INVITE_EMAIL_SUBJECT?.trim() || DEFAULT_APPOINTMENT_INVITE_EMAIL_SUBJECT
      : process.env.TEMPLATE_INCLINIC_INVITE_EMAIL_SUBJECT?.trim() || DEFAULT_INCLINIC_INVITE_EMAIL_SUBJECT,
    v
  );

  const bodyHtml = isOnline
    ? [
        paragraph(`Dear ${escapeInline(v.patientName)},`),
        paragraph(
          `Your <strong>online consultation</strong> with <strong>${escapeInline(v.doctorName)}</strong> is confirmed.`
        ),
        detailRow("Date", escapeInline(v.appointmentDate ?? "")),
        detailRow("Time", escapeInline(v.appointmentTime ?? "")),
        paragraph("Join from mobile or desktop. Please connect 5 minutes before your scheduled time from a quiet, private place.")
      ].join("")
    : [
        paragraph(`Dear ${escapeInline(v.patientName)},`),
        paragraph(
          `Your visit with <strong>${escapeInline(v.doctorName)}</strong> at ${escapeInline(v.clinicName)} is confirmed.`
        ),
        detailRow("Date", escapeInline(v.appointmentDate ?? "")),
        detailRow("Time", escapeInline(v.appointmentTime ?? "")),
        paragraph("Please arrive a few minutes early. Bring any prior reports or prescriptions if applicable.")
      ].join("");

  const bodyText = isOnline
    ? `Dear ${v.patientName}, your online consultation with ${v.doctorName} at ${v.clinicName} is on ${v.appointmentDate} at ${v.appointmentTime}. Join: ${v.meetingLink}`
    : `Dear ${v.patientName}, your visit with ${v.doctorName} at ${v.clinicName} is on ${v.appointmentDate} at ${v.appointmentTime}.`;

  const built = buildTransactionalEmail({
    preheader: isOnline ? "Your video consultation details" : "Your clinic visit is confirmed",
    title: isOnline ? "Online consultation confirmed" : "Clinic visit confirmed",
    bodyHtml,
    bodyText,
    clinicName: v.clinicName,
    ctaLabel: isOnline ? "Join video consultation" : undefined,
    ctaUrl: isOnline ? v.meetingLink : undefined
  });

  return { subject, html: built.html, text: built.text };
}

export function appointmentReminderEmail(v: NotificationTemplateVars): EmailPayload {
  const subject = applyVars(
    process.env.TEMPLATE_APPOINTMENT_REMINDER_EMAIL_SUBJECT?.trim() || DEFAULT_APPOINTMENT_REMINDER_EMAIL_SUBJECT,
    v
  );

  const bodyHtml = [
    paragraph(`Dear ${escapeInline(v.patientName)},`),
    paragraph(
      `This is a reminder for your upcoming consultation with <strong>${escapeInline(v.doctorName)}</strong>.`
    ),
    detailRow("Date", escapeInline(v.appointmentDate ?? "")),
    detailRow("Time", escapeInline(v.appointmentTime ?? ""))
  ].join("");

  const bodyText = `Reminder: consultation with ${v.doctorName} on ${v.appointmentDate} at ${v.appointmentTime}. Join: ${v.meetingLink}`;

  const built = buildTransactionalEmail({
    preheader: `Reminder: ${v.appointmentDate} at ${v.appointmentTime}`,
    title: "Appointment reminder",
    bodyHtml,
    bodyText,
    clinicName: v.clinicName,
    ctaLabel: v.meetingLink ? "Join consultation" : undefined,
    ctaUrl: v.meetingLink || undefined
  });

  return { subject, html: built.html, text: built.text };
}

export function prescriptionDeliveryEmail(v: NotificationTemplateVars): EmailPayload {
  const subject = applyVars(
    process.env.TEMPLATE_PRESCRIPTION_EMAIL_SUBJECT?.trim() || DEFAULT_PRESCRIPTION_EMAIL_SUBJECT,
    v
  );

  const summary = v.consultationSummary?.trim();
  const bodyHtml = [
    paragraph(`Dear ${escapeInline(v.patientName)},`),
    paragraph(
      summary ||
        `Your consultation with <strong>${escapeInline(v.doctorName)}</strong> is complete. Your prescription is ready to view securely.`
    ),
    paragraph("Tap the button below to open your prescription. This link is personal — please do not share it.")
  ].join("");

  const bodyText = [
    summary || `Your prescription from ${v.doctorName} at ${v.clinicName} is ready.`,
    v.prescriptionLink ? `View: ${v.prescriptionLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const built = buildTransactionalEmail({
    preheader: "Your prescription is ready",
    title: "Prescription ready",
    bodyHtml,
    bodyText,
    clinicName: v.clinicName,
    ctaLabel: v.prescriptionLink ? "View prescription" : undefined,
    ctaUrl: v.prescriptionLink
  });

  return { subject, html: built.html, text: built.text };
}

export function consultationSummaryEmail(v: NotificationTemplateVars): EmailPayload {
  const subject = applyVars(
    process.env.TEMPLATE_CONSULTATION_SUMMARY_EMAIL_SUBJECT?.trim() || DEFAULT_SUMMARY_EMAIL_SUBJECT,
    v
  );

  const bodyHtml = [
    paragraph(`Dear ${escapeInline(v.patientName)},`),
    paragraph(`Thank you for your consultation with <strong>${escapeInline(v.doctorName)}</strong>.`),
    paragraph(escapeInline(v.consultationSummary ?? "Your visit notes and next steps are available below."))
  ].join("");

  const bodyText = [
    `Thank you for your consultation with ${v.doctorName} at ${v.clinicName}.`,
    v.consultationSummary ?? "",
    v.prescriptionLink ? `Prescription: ${v.prescriptionLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const built = buildTransactionalEmail({
    preheader: "Your consultation summary",
    title: "Consultation summary",
    bodyHtml,
    bodyText,
    clinicName: v.clinicName,
    ctaLabel: v.prescriptionLink ? "View prescription" : undefined,
    ctaUrl: v.prescriptionLink
  });

  return { subject, html: built.html, text: built.text };
}

export function consultationMissedEmail(v: NotificationTemplateVars): EmailPayload {
  const subject = applyVars(
    process.env.TEMPLATE_CONSULTATION_MISSED_EMAIL_SUBJECT?.trim() || DEFAULT_MISSED_EMAIL_SUBJECT,
    v
  );

  const bodyHtml = [
    paragraph(`Dear ${escapeInline(v.patientName)},`),
    paragraph(
      `We were unable to connect for your scheduled consultation with <strong>${escapeInline(v.doctorName)}</strong>.`
    ),
    detailRow("Date", escapeInline(v.appointmentDate ?? "")),
    detailRow("Time", escapeInline(v.appointmentTime ?? "")),
    paragraph("Please contact the clinic to reschedule at your earliest convenience.")
  ].join("");

  const bodyText = `We missed you for your consultation with ${v.doctorName} on ${v.appointmentDate} at ${v.appointmentTime}. Please contact ${v.clinicName} to reschedule.`;

  const built = buildTransactionalEmail({
    preheader: "Please reschedule your consultation",
    title: "Missed consultation",
    bodyHtml,
    bodyText,
    clinicName: v.clinicName,
    ctaLabel: v.meetingLink ? "Reschedule / contact clinic" : undefined,
    ctaUrl: v.meetingLink || undefined
  });

  return { subject, html: built.html, text: built.text };
}

export function followUpReminderEmail(v: NotificationTemplateVars, note?: string): EmailPayload {
  const subject = applyVars(
    process.env.TEMPLATE_FOLLOWUP_EMAIL_SUBJECT?.trim() || DEFAULT_FOLLOWUP_EMAIL_SUBJECT,
    v
  );

  const followup = v.followupDate?.trim() || "soon";
  const bodyHtml = [
    paragraph(`Dear ${escapeInline(v.patientName)},`),
    paragraph(
      `This is a friendly reminder about your recommended follow-up with <strong>${escapeInline(v.doctorName)}</strong>.`
    ),
    detailRow("Recommended date", escapeInline(followup)),
    note ? paragraph(escapeInline(note)) : "",
    paragraph("Please contact the clinic to book your follow-up visit if you have not already.")
  ].join("");

  const bodyText = `Follow-up reminder for ${v.patientName}: recommended date ${followup}. ${note ?? ""} — ${v.clinicName}`;

  const built = buildTransactionalEmail({
    preheader: `Follow-up recommended ${followup}`,
    title: "Follow-up reminder",
    bodyHtml,
    bodyText,
    clinicName: v.clinicName
  });

  return { subject, html: built.html, text: built.text };
}

function escapeInline(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function appointmentReminderWhatsApp(v: NotificationTemplateVars): string {
  const raw =
    process.env.TEMPLATE_APPOINTMENT_REMINDER_WHATSAPP?.trim() ||
    "Reminder: online consultation with {{doctor_name}} ({{clinic_name}}) at {{appointment_time}} on {{appointment_date}}.\nJoin: {{meeting_link}}";
  return applyVars(raw, v);
}

export function prescriptionWhatsApp(v: NotificationTemplateVars): string {
  const raw =
    process.env.TEMPLATE_PRESCRIPTION_WHATSAPP?.trim() ||
    "Hello {{patient_name}}, your prescription from {{doctor_name}} ({{clinic_name}}) is ready.\n{{prescription_link}}";
  return applyVars(raw, v);
}

export function consultationSummaryWhatsApp(v: NotificationTemplateVars): string {
  const raw =
    process.env.TEMPLATE_CONSULTATION_SUMMARY_WHATSAPP?.trim() ||
    "Hello {{patient_name}}, thank you for your consultation with {{doctor_name}} at {{clinic_name}}.\n{{consultation_summary}}\nPrescription: {{prescription_link}}";
  return applyVars(raw, v);
}

const DEFAULT_CONSULTATION_READY_WHATSAPP =
  "Dr. {{doctor_name}} is ready for your consultation at {{clinic_name}}. Join now: {{meeting_link}}";

export function consultationReadyWhatsApp(v: NotificationTemplateVars): string {
  const raw =
    process.env.TEMPLATE_CONSULTATION_READY_WHATSAPP?.trim() || DEFAULT_CONSULTATION_READY_WHATSAPP;
  return applyVars(raw, v);
}

const DEFAULT_MISSED_WHATSAPP =
  "Hello {{patient_name}}, we missed you for your scheduled consultation with {{doctor_name}} at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}. Please contact the clinic to reschedule.";

export function consultationMissedWhatsApp(v: NotificationTemplateVars): string {
  const raw = process.env.TEMPLATE_CONSULTATION_MISSED_WHATSAPP?.trim() || DEFAULT_MISSED_WHATSAPP;
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

export function formatFollowUpDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}
