"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Loader2,
  Plus,
  Search,
  Video,
  Copy
} from "lucide-react";
import { PageHeader } from "../../../components/platform/PageHeader";
import { fetchCourses, createCourse, cloneCourse, type ContentCourseSummary } from "../../../lib/doctor-api";
import { cn } from "../../../lib/cn";
import { DS_BTN_PRIMARY, DS_FIELD_SEARCH, DS_SURFACE_PANEL } from "../../../lib/ds-classes";
import { EmptyState, ErrorState } from "../../../components/ui/LoadState";

import { OfficialTemplateBadge } from "../../../components/care-plans/OfficialTemplateBadge";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ContentLibraryPage(): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<ContentCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [showOfficial, setShowOfficial] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCourses();
      setItems(list);
    } catch {
      setError("Could not load courses. Run the latest database migration if this is a new install.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { id } = await createCourse({
        title: "New Course",
        status: "draft"
      });
      router.push(`/content-library/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleClone = async (courseId: string) => {
    try {
      const { id } = await cloneCourse(courseId);
      router.push(`/content-library/${id}`);
    } catch (err) {
      alert("Failed to clone course.");
    }
  };

  const filteredItems = items.filter(
    (item) => item.title.toLowerCase().includes(q.toLowerCase()) || (item.description ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const officialItems = filteredItems.filter((i) => i.is_official || i.isOfficial);
  const customItems = filteredItems.filter((i) => !i.is_official && !i.isOfficial);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Content Library (LMS)"
        description="Build scalable courses, modules, and lessons that can be assigned to Patient Care Plans."
        action={
          <button type="button" onClick={() => void handleCreate()} disabled={creating} className={DS_BTN_PRIMARY}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Plus className="h-4 w-4 inline mr-2" />}
            New Course
          </button>
        }
      />

      <div className="mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hs-text-tertiary" aria-hidden />
          <input
            className={DS_FIELD_SEARCH}
            placeholder="Search courses..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {error ? <ErrorState err={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-hs-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Official Templates Section */}
          {officialItems.length > 0 && (
            <section>
              <button 
                onClick={() => setShowOfficial(!showOfficial)}
                className="flex w-full items-center justify-between group mb-4 border-b border-hs-border/40 pb-2"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-hs-ink">Official GlowHomeo Courses</h2>
                  <span className="rounded-full bg-hs-cream px-2 py-0.5 text-xs font-medium text-hs-text-secondary">
                    {officialItems.length}
                  </span>
                </div>
                <div className="text-hs-text-tertiary group-hover:text-hs-ink">
                  {showOfficial ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>
              
              {showOfficial && (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {officialItems.map((c) => (
                    <li key={c.id} className={cn(DS_SURFACE_PANEL, "flex flex-col overflow-hidden border-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/30 transition hover:border-emerald-500/40")}>
                      {c.thumbnailUrl ? (
                        <div className="h-32 w-full bg-hs-cream object-cover overflow-hidden shrink-0">
                           <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-32 w-full bg-hs-cream/50 flex items-center justify-center shrink-0 border-b border-emerald-500/10">
                          <Video className="h-8 w-8 text-emerald-600/30" />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="mb-3">
                          <OfficialTemplateBadge />
                        </div>
                        <Link href={`/content-library/${c.id}`} className="min-w-0 flex-1 group block mb-4">
                          <p className="font-semibold text-hs-ink group-hover:text-emerald-700 leading-tight mb-1.5">{c.title}</p>
                          {c.description ? (
                            <p className="text-caption-sm text-hs-text-secondary line-clamp-2">{c.description}</p>
                          ) : null}
                        </Link>
                        <div className="mt-auto pt-4 flex gap-2 border-t border-hs-border/30 justify-between items-center">
                          <Link href={`/content-library/${c.id}`} className="text-caption-sm font-semibold text-hs-text-secondary hover:text-hs-ink flex items-center gap-1.5">
                            <Search className="h-3.5 w-3.5" /> Preview
                          </Link>
                          <button type="button" onClick={() => void handleClone(c.id)} className="text-caption-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 bg-emerald-100/50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                            <Copy className="h-3.5 w-3.5" /> Use Template
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Custom Templates Section */}
          <section>
            <div className="mb-4 border-b border-hs-border/40 pb-2">
              <h2 className="text-lg font-semibold text-hs-ink">My Courses</h2>
            </div>
            
            {customItems.length === 0 ? (
              <EmptyState
                title="No custom courses yet"
                description="Create comprehensive courses with modules and lessons."
                action={
                  <button type="button" onClick={() => void handleCreate()} className={DS_BTN_PRIMARY}>
                    Create your first course
                  </button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customItems.map((c) => (
                  <div key={c.id} className={cn(DS_SURFACE_PANEL, "flex flex-col overflow-hidden transition hover:border-hs-primary/25")}>
                    {c.thumbnailUrl ? (
                      <div className="h-32 w-full bg-hs-cream object-cover overflow-hidden shrink-0">
                         <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-hs-cream/50 flex items-center justify-center shrink-0 border-b border-hs-border/20">
                        <Video className="h-8 w-8 text-hs-text-tertiary/50" />
                      </div>
                    )}
                    
                    <div className="p-4 flex flex-col flex-1">
                      <Link href={`/content-library/${c.id}`} className="min-w-0 flex-1 group">
                        <p className="font-semibold text-hs-ink group-hover:text-hs-primary truncate">{c.title}</p>
                        {c.description ? (
                          <p className="mt-1 text-caption-sm text-hs-text-secondary line-clamp-2">{c.description}</p>
                        ) : null}
                      </Link>
                      
                      <div className="mt-3 flex flex-wrap gap-1">
                        {c.status === "draft" ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 border border-amber-200">Draft</span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 border border-emerald-200">Published</span>
                        )}
                      </div>
                      
                      <div className="mt-auto pt-4 flex gap-2 border-t border-hs-border/20">
                        <Link href={`/content-library/${c.id}`} className="text-caption-sm font-semibold text-hs-primary hover:underline flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" /> Edit Course
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
