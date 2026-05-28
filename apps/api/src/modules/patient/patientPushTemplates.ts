import type { PatientNotificationTopic } from "./types";

/** PHI-light push copy — no remedy names or conditions (see docs/MOBILE_API.md). */
export function patientPushCopy(
  topic: PatientNotificationTopic | string,
  payload: Record<string, unknown> = {}
): { title: string; body: string; channelId: string; deepLink: string } {
  const slot = typeof payload.slot === "string" ? payload.slot : "morning";
  switch (topic) {
    case "patient.medication_reminder":
      return {
        title: `Time for your ${slot} dose`,
        body: "Open the app to mark today's dose.",
        channelId: "medication",
        deepLink: "homeoassist://today"
      };
    case "patient.diet_reminder":
      return {
        title: "Diet reminder",
        body: "Check today's diet plan in the app.",
        channelId: "diet",
        deepLink: "homeoassist://today"
      };
    case "patient.follow_up_due":
      return {
        title: "Follow-up due",
        body: "Share how you are feeling with your clinic.",
        channelId: "follow_up",
        deepLink: "homeoassist://follow-ups"
      };
    case "patient.appointment_reminder_24h":
      return {
        title: "Appointment tomorrow",
        body: "You have an upcoming appointment. Open the app for details.",
        channelId: "appointments",
        deepLink: "homeoassist://appointments"
      };
    case "patient.appointment_reminder_1h":
      return {
        title: "Appointment in 1 hour",
        body: "Your appointment is coming up soon.",
        channelId: "appointments",
        deepLink: "homeoassist://appointments"
      };
    case "patient.message_from_clinic":
      return {
        title: "New message",
        body: "Your clinic has sent you a message.",
        channelId: "messages",
        deepLink: "homeoassist://messages"
      };
    case "patient.prescription_ready":
      return {
        title: "Prescription ready",
        body: "Open the app to view your new prescription.",
        channelId: "prescription",
        deepLink: "homeoassist://visits"
      };
    case "patient.new_content":
      return {
        title: "New tip from your clinic",
        body: "Open the app to view.",
        channelId: "content",
        deepLink: "homeoassist://content"
      };
    default:
      return {
        title: "GlowHomeo",
        body: "You have a new notification.",
        channelId: "default",
        deepLink: "homeoassist://today"
      };
  }
}
