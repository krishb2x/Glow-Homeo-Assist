import { describe, expect, it } from "vitest";
import {
  appointmentInviteEmail,
  appointmentReminderEmail,
  consultationMissedEmail,
  followUpReminderEmail,
  prescriptionDeliveryEmail
} from "../telemedicine/messageTemplates";

const vars = {
  patientName: "Anita",
  doctorName: "Dr. Sharma",
  clinicName: "Glow Clinic",
  appointmentDate: "Mon, 2 Jun 2026",
  appointmentTime: "10:30 am",
  meetingLink: "https://app.example.com/join/abc",
  prescriptionLink: "https://app.example.com/rx/abc",
  consultationSummary: "Your visit is complete.",
  followupDate: "Mon, 16 Jun 2026"
};

describe("appointmentInviteEmail", () => {
  it("builds online invite with join CTA", () => {
    const mail = appointmentInviteEmail(vars, "ONLINE");
    expect(mail.subject).toContain("Glow Clinic");
    expect(mail.html).toContain("Join video consultation");
    expect(mail.text).toContain(vars.meetingLink);
  });

  it("builds in-clinic invite without video CTA", () => {
    const mail = appointmentInviteEmail(vars, "IN_CLINIC");
    expect(mail.subject).toContain("Clinic visit");
    expect(mail.html).not.toContain("Join video consultation");
  });
});

describe("appointmentReminderEmail", () => {
  it("includes reminder details", () => {
    const mail = appointmentReminderEmail(vars);
    expect(mail.subject).toContain("Reminder");
    expect(mail.html).toContain("10:30 am");
  });
});

describe("prescriptionDeliveryEmail", () => {
  it("includes prescription link CTA", () => {
    const mail = prescriptionDeliveryEmail(vars);
    expect(mail.html).toContain("View prescription");
    expect(mail.text).toContain(vars.prescriptionLink);
  });
});

describe("consultationMissedEmail", () => {
  it("asks patient to reschedule", () => {
    const mail = consultationMissedEmail(vars);
    expect(mail.html).toContain("Missed consultation");
    expect(mail.text).toContain("reschedule");
  });
});

describe("followUpReminderEmail", () => {
  it("includes follow-up date", () => {
    const mail = followUpReminderEmail(vars, "Bring prior reports");
    expect(mail.html).toContain("Mon, 16 Jun 2026");
    expect(mail.html).toContain("Bring prior reports");
  });
});
