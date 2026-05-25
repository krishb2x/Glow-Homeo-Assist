import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepInlineValidation } from "./StepInlineValidation";

describe("StepInlineValidation", () => {
  it("renders nothing when inactive", () => {
    const { container } = render(
      <StepInlineValidation
        active={false}
        validation={{ done: false, missing: ["Chief complaint"], warnings: [] }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows missing fields when active", () => {
    render(
      <StepInlineValidation
        active
        validation={{ done: false, missing: ["Chief complaint", "Vitals"], warnings: [] }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Still needed");
    expect(screen.getByText(/Chief complaint/)).toBeTruthy();
  });

  it("shows warnings", () => {
    render(
      <StepInlineValidation
        active
        validation={{ done: true, missing: [], warnings: ["Pulse looks unusual"] }}
      />
    );
    expect(screen.getByText(/Pulse looks unusual/)).toBeTruthy();
  });
});
