import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContentLibraryPage from "./page";
import { fetchCourses, createCourse } from "../../../lib/doctor-api";
import { useRouter } from "next/navigation";

// Mock the Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn()
}));

// Mock the API client
vi.mock("../../../lib/doctor-api", () => ({
  fetchCourses: vi.fn(),
  createCourse: vi.fn()
}));

describe("ContentLibraryPage", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush
    });
  });

  it("shows loading state initially, then empty state if no courses", async () => {
    vi.mocked(fetchCourses).mockResolvedValueOnce([]);

    render(<ContentLibraryPage />);
    
    // Expect loading spinner (Wait for it to disappear)
    await waitFor(() => {
      expect(screen.getByText("No courses yet")).toBeInTheDocument();
    });

    expect(screen.getByText("Create comprehensive courses with modules and lessons.")).toBeInTheDocument();
  });

  it("renders a list of courses from the API", async () => {
    vi.mocked(fetchCourses).mockResolvedValueOnce([
      { id: "c1", title: "Yoga Course", status: "published", clinicId: "clinic1", doctorId: "doc1", createdAt: "", updatedAt: "" },
      { id: "c2", title: "Diet Course", status: "draft", clinicId: "clinic1", doctorId: "doc1", createdAt: "", updatedAt: "" }
    ]);

    render(<ContentLibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Yoga Course")).toBeInTheDocument();
    });

    expect(screen.getByText("Diet Course")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("handles creating a new course", async () => {
    vi.mocked(fetchCourses).mockResolvedValueOnce([{ id: "c1", title: "Existing", status: "published", clinicId: "c", doctorId: "d", createdAt: "", updatedAt: "" }]);
    vi.mocked(createCourse).mockResolvedValueOnce({ id: "new-course-id" } as any);

    render(<ContentLibraryPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Existing")).toBeInTheDocument();
    });

    const createBtn = screen.getAllByRole("button")[0]!; // First button is in the header
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(createCourse).toHaveBeenCalledWith({ title: "New Course", status: "draft" });
      expect(mockPush).toHaveBeenCalledWith("/content-library/new-course-id");
    });
  });
});
