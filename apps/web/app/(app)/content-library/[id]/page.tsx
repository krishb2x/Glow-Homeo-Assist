"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCourse, updateCourse, type ContentCourseDetail } from "../../../../lib/doctor-api";
import { CourseEditor } from "../../../../components/content-library/CourseEditor";
import { Loader2 } from "lucide-react";
import { ErrorState } from "../../../../components/ui/LoadState";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCoursePage({ params }: PageProps): JSX.Element {
  const router = useRouter();
  const { id } = use(params);

  const [course, setCourse] = useState<ContentCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourse(id);
      setCourse(data);
    } catch {
      setError("Could not load the course. It may have been deleted.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (next: ContentCourseDetail) => {
    setCourse(next);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-hs-primary" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <ErrorState err={error || "Course not found"} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <CourseEditor course={course} onSaved={handleSaved} />
    </div>
  );
}
