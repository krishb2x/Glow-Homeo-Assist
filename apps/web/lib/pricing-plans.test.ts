import { describe, expect, it } from "vitest";
import {
  ANNUAL_DISCOUNT,
  PRICING_PLANS,
  annualBilledInr,
  effectiveMonthlyPriceInr,
  findPlan,
  formatInr
} from "./pricing-plans";

describe("PRICING_PLANS", () => {
  it("exposes three plans with stable ids", () => {
    expect(PRICING_PLANS.map((p) => p.id)).toEqual(["solo", "clinic", "scale"]);
  });

  it("marks exactly one featured plan", () => {
    const featured = PRICING_PLANS.filter((p) => p.featured);
    expect(featured).toHaveLength(1);
    expect(featured[0]!.id).toBe("clinic");
  });

  it("treats the Scale plan as custom pricing", () => {
    const scale = findPlan("scale")!;
    expect(scale.monthlyPriceInr).toBe(0);
    expect(scale.doctorSeats).toBeNull();
  });

  it("Solo and Clinic have positive monthly prices", () => {
    for (const id of ["solo", "clinic"] as const) {
      const p = findPlan(id)!;
      expect(p.monthlyPriceInr).toBeGreaterThan(0);
    }
  });

  it("every plan has at least one CTA that links somewhere", () => {
    for (const p of PRICING_PLANS) {
      expect(p.ctaLabel.length).toBeGreaterThan(0);
      expect(p.ctaHref.startsWith("/")).toBe(true);
    }
  });

  it("every plan ships with shared feature anchors", () => {
    for (const p of PRICING_PLANS) {
      const labels = p.features.map((f) => f.label.toLowerCase());
      expect(labels.some((l) => l.includes("patient care app"))).toBe(true);
      expect(labels.some((l) => l.includes("prescription"))).toBe(true);
    }
  });
});

describe("effectiveMonthlyPriceInr", () => {
  const solo = findPlan("solo")!;

  it("returns the listed price for monthly billing", () => {
    expect(effectiveMonthlyPriceInr(solo, "monthly")).toBe(solo.monthlyPriceInr);
  });

  it("applies the documented annual discount", () => {
    const annual = effectiveMonthlyPriceInr(solo, "annual");
    const expected = Math.round(solo.monthlyPriceInr * (1 - ANNUAL_DISCOUNT));
    expect(annual).toBe(expected);
    expect(annual).toBeLessThan(solo.monthlyPriceInr);
  });

  it("returns 0 for custom-priced plans regardless of cycle", () => {
    const scale = findPlan("scale")!;
    expect(effectiveMonthlyPriceInr(scale, "monthly")).toBe(0);
    expect(effectiveMonthlyPriceInr(scale, "annual")).toBe(0);
  });
});

describe("annualBilledInr", () => {
  it("equals 12 × effective monthly price", () => {
    const clinic = findPlan("clinic")!;
    const monthly = effectiveMonthlyPriceInr(clinic, "monthly");
    expect(annualBilledInr(clinic, "monthly")).toBe(monthly * 12);
  });

  it("is cheaper on annual billing than 12 × monthly", () => {
    const clinic = findPlan("clinic")!;
    expect(annualBilledInr(clinic, "annual")).toBeLessThan(annualBilledInr(clinic, "monthly"));
  });
});

describe("formatInr", () => {
  it("uses the Indian rupee symbol and lakh-style grouping", () => {
    const out = formatInr(150000);
    expect(out).toContain("₹");
    expect(out).toMatch(/1,50,000/);
  });

  it("returns 'Custom' for a zero amount", () => {
    expect(formatInr(0)).toBe("Custom");
  });
});

describe("findPlan", () => {
  it("returns the matching plan", () => {
    expect(findPlan("clinic")?.id).toBe("clinic");
  });

  it("returns null for unknown ids when cast", () => {
    expect(findPlan("missing" as never)).toBeNull();
  });
});
