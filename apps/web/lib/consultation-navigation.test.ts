import { describe, expect, it } from "vitest";
import {
  consultationLinkProps,
  consultationStartHref,
  liveConsultationHref,
  shouldOpenConsultationInNewTab
} from "./consultation-navigation";

describe("consultation-navigation", () => {
  it("opens live visits in a new tab but not the hub picker", () => {
    expect(shouldOpenConsultationInNewTab("/consultation")).toBe(false);
    expect(shouldOpenConsultationInNewTab("/consultation/abc")).toBe(true);
    expect(shouldOpenConsultationInNewTab("/consultation/abc?step=history")).toBe(true);
    expect(shouldOpenConsultationInNewTab("/consultation?patientId=x")).toBe(true);
  });

  it("adds target blank props for live visit links", () => {
    expect(consultationLinkProps("/consultation/abc")).toEqual({
      target: "_blank",
      rel: "noopener noreferrer"
    });
    expect(consultationLinkProps("/consultation")).toEqual({});
  });

  it("builds live visit URL at saved or default step", () => {
    expect(liveConsultationHref("id-1")).toBe("/consultation/id-1?step=patient");
    expect(liveConsultationHref("id-1", "prescription")).toBe("/consultation/id-1?step=prescription");
    localStorage.setItem("glowhomeo_consult_step_id-2", "notes");
    expect(liveConsultationHref("id-2")).toBe("/consultation/id-2?step=notes");
  });

  it("builds consultation start query URLs", () => {
    expect(consultationStartHref({ patientId: "p1" })).toBe("/consultation?patientId=p1");
    expect(
      consultationStartHref({ patientId: "p1", appointmentId: "a1", consultationMode: "ONLINE" })
    ).toBe("/consultation?patientId=p1&appointmentId=a1&consultationMode=ONLINE");
  });
});
