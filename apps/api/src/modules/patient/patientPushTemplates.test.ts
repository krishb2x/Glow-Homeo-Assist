import { describe, expect, it } from "vitest";
import { patientPushCopy } from "./patientPushTemplates";
import { PATIENT_NOTIFICATION_TOPICS } from "./types";

describe("patientPushCopy", () => {
  it("uses PHI-light medication reminder text", () => {
    const copy = patientPushCopy(PATIENT_NOTIFICATION_TOPICS.medicationReminder, {
      slot: "evening"
    });
    expect(copy.title).toContain("evening");
    expect(copy.body).not.toMatch(/arsenic|album/i);
    expect(copy.deepLink).toBe("homeoassist://today");
  });

  it("maps message from clinic", () => {
    const copy = patientPushCopy(PATIENT_NOTIFICATION_TOPICS.messageFromClinic);
    expect(copy.title).toBe("New message");
  });
});
