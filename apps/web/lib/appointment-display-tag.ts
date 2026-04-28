import type { MyDayAppointment, PatientListItem, PatientTag } from "./doctor-api";

/** Derive a single schedule tag when the API does not send `displayTag`. */
export function appointmentDisplayTag(apt: MyDayAppointment, patient: PatientListItem | undefined): PatientTag {
  if (apt.displayTag) return apt.displayTag;
  const blob = `${apt.reason ?? ""} ${apt.chiefComplaint ?? ""}`.toLowerCase();
  if (blob.includes("new") && (blob.includes("patient") || blob.includes("visit"))) return "first_visit";
  if (blob.includes("first") && blob.includes("visit")) return "first_visit";
  if (blob.includes("follow")) return "follow_up";
  const pt = patient?.tags;
  if (pt?.includes("chronic")) return "chronic";
  if (pt?.includes("follow_up")) return "follow_up";
  if (pt?.includes("first_visit")) return "first_visit";
  if (pt?.includes("acute")) return "acute";
  return "acute";
}
