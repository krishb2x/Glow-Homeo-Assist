import { describe, expect, it } from "vitest";
import { extractTemplateVariables, personalizeTemplate } from "./variableResolver";

describe("variableResolver", () => {
  it("extracts known variables from template body", () => {
    const vars = extractTemplateVariables(
      "Hello {{patient_name}}, visit {{clinic_name}} on {{last_visit_date}}."
    );
    expect(vars).toContain("patient_name");
    expect(vars).toContain("clinic_name");
    expect(vars).toContain("last_visit_date");
    expect(vars).not.toContain("unknown" as never);
  });

  it("personalizes placeholders", () => {
    const out = personalizeTemplate("Hi {{patient_name}} from {{doctor_name}}", {
      patientName: "Asha",
      clinicName: "Glow Clinic",
      doctorName: "Dr. Mehta"
    });
    expect(out).toBe("Hi Asha from Dr. Mehta");
  });
});
