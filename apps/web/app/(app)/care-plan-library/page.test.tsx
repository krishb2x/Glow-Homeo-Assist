import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CarePlanLibraryPage from "./page";
import { fetchCarePlans, fetchRecentCarePlans, cloneCarePlan } from "../../../lib/doctor-api";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn()
}));

vi.mock("../../../lib/doctor-api", () => ({
  fetchCarePlans: vi.fn(),
  fetchRecentCarePlans: vi.fn(),
  cloneCarePlan: vi.fn(),
  createCarePlan: vi.fn(),
  deleteCarePlan: vi.fn(),
  toggleCarePlanFavorite: vi.fn()
}));

vi.mock("../../../components/care-plans/OfficialTemplateBadge", () => ({
  OfficialTemplateBadge: () => <span data-testid="official-badge">Official Badge</span>
}));

describe("CarePlanLibraryPage", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush
    });
    vi.mocked(fetchRecentCarePlans).mockResolvedValue([]);
  });

  it("loads and displays official and custom templates", async () => {
    // Mock official fetch
    vi.mocked(fetchCarePlans).mockImplementation((opts) => {
      if (opts?.templateType === "official") {
        return Promise.resolve([
          { id: "off1", title: "Official Hair Plan", primaryCategory: "wellness_plan", status: "published", diseaseTags: [], blockCount: 0, isOwn: false, isFavorite: false } as any
        ]);
      }
      return Promise.resolve([
        { id: "cust1", title: "Custom Skin Plan", primaryCategory: "wellness_plan", status: "draft", diseaseTags: [], blockCount: 0, isOwn: true, isFavorite: false } as any
      ]);
    });

    render(<CarePlanLibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Official Hair Plan")).toBeInTheDocument();
    });

    expect(screen.getByText("Custom Skin Plan")).toBeInTheDocument();
    expect(screen.getByTestId("official-badge")).toBeInTheDocument();
  });

  it("handles cloning an official template via 'Use Template'", async () => {
    vi.mocked(fetchCarePlans).mockResolvedValueOnce([
      { id: "off1", title: "Official Plan to Clone", primaryCategory: "wellness_plan", status: "published", diseaseTags: [], blockCount: 0, isOwn: false, isFavorite: false } as any
    ]);
    vi.mocked(fetchCarePlans).mockResolvedValueOnce([]); // custom
    vi.mocked(cloneCarePlan).mockResolvedValueOnce({ id: "cloned-id" } as any);

    render(<CarePlanLibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Official Plan to Clone")).toBeInTheDocument();
    });

    const useTemplateBtn = screen.getAllByText(/use template/i)[0]!;
    fireEvent.click(useTemplateBtn);

    await waitFor(() => {
      expect(cloneCarePlan).toHaveBeenCalledWith("off1");
      expect(mockPush).toHaveBeenCalledWith("/care-plan-library/cloned-id");
    });
  });
});
