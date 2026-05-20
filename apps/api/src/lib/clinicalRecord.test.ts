import { describe, expect, it } from "vitest";
import {
  HistorySchema,
  ClinicalRecordSchema,
  mergeClinicalRecordPatch,
  parseClinicalRecord
} from "@homeoassist/domain";

describe("HistorySchema", () => {
  it("defaults all four history fields to empty strings", () => {
    const parsed = HistorySchema.parse({});
    expect(parsed).toEqual({
      pastDiseases: "",
      medications: "",
      familyHistory: "",
      drugAllergies: ""
    });
  });

  it("accepts full history payload from the v2 chart UI", () => {
    const parsed = HistorySchema.parse({
      pastDiseases: "Asthma since 2010",
      medications: "Inhaler PRN",
      familyHistory: "Father — T2DM",
      drugAllergies: "Sulfa — rash"
    });
    expect(parsed.familyHistory).toBe("Father — T2DM");
    expect(parsed.drugAllergies).toBe("Sulfa — rash");
  });

  it("tolerates legacy rows missing the new fields (back-compat)", () => {
    const legacy = { pastDiseases: "x", medications: "y" } as const;
    const parsed = HistorySchema.parse(legacy);
    expect(parsed.familyHistory).toBe("");
    expect(parsed.drugAllergies).toBe("");
  });

  it("rejects oversize values to keep the JSONB column bounded", () => {
    const bad = HistorySchema.safeParse({ familyHistory: "x".repeat(4001) });
    expect(bad.success).toBe(false);
  });
});

describe("ClinicalRecord round-trip", () => {
  it("parses a v1 row without the new fields and fills defaults", () => {
    const v1Row = {
      version: 0,
      labs: [],
      clinicalNotes: { observations: "", diagnosisThinking: "" },
      history: { pastDiseases: "Asthma", medications: "" }
    };
    const parsed = parseClinicalRecord(v1Row);
    expect(parsed.history).toMatchObject({
      pastDiseases: "Asthma",
      medications: "",
      familyHistory: "",
      drugAllergies: ""
    });
  });

  it("round-trips a v2 record through schema parse", () => {
    const v2Row = ClinicalRecordSchema.parse({
      history: {
        pastDiseases: "",
        medications: "",
        familyHistory: "Mother — Migraine",
        drugAllergies: "Penicillin — anaphylaxis"
      }
    });
    expect(v2Row.history.familyHistory).toBe("Mother — Migraine");
    expect(v2Row.history.drugAllergies).toBe("Penicillin — anaphylaxis");
  });
});

describe("mergeClinicalRecordPatch", () => {
  it("merges new history keys without dropping the existing ones", () => {
    const prev = {
      history: { pastDiseases: "Asthma", medications: "Inhaler" }
    };
    const merged = mergeClinicalRecordPatch(prev, {
      history: { familyHistory: "Father — HTN" }
    });
    expect(merged.history).toEqual({
      pastDiseases: "Asthma",
      medications: "Inhaler",
      familyHistory: "Father — HTN"
    });
  });

  it("overwrites drugAllergies when a new value is patched", () => {
    const prev = {
      history: { drugAllergies: "Sulfa", pastDiseases: "" }
    };
    const merged = mergeClinicalRecordPatch(prev, {
      history: { drugAllergies: "Sulfa — rash; Penicillin — anaphylaxis" }
    });
    expect(merged.history).toMatchObject({
      drugAllergies: "Sulfa — rash; Penicillin — anaphylaxis",
      pastDiseases: ""
    });
  });

  it("ignores undefined patch slices (no-op)", () => {
    const prev = { history: { pastDiseases: "Asthma" } };
    const merged = mergeClinicalRecordPatch(prev, {});
    expect(merged.history).toEqual({ pastDiseases: "Asthma" });
  });
});
