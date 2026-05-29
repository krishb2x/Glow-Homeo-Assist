"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, Video, FileText, Copy, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  updateCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  cloneCourse,
  type ContentCourseDetail,
  type ContentModule,
  type ContentLesson
} from "../../lib/doctor-api";
import { cn } from "../../lib/cn";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY, DS_FIELD, DS_SURFACE_PANEL } from "../../lib/ds-classes";

type Props = {
  course: ContentCourseDetail;
  onSaved: (course: ContentCourseDetail) => void;
};

export function CourseEditor({ course, onSaved }: Props): JSX.Element {
  const router = useRouter();
  const isOfficial = !!(course as any).isOfficial || !!(course as any).is_official;

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? "");
  const [status, setStatus] = useState(course.status);
  
  const [modules, setModules] = useState<ContentModule[]>(course.modules);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCourse(course.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        status
      });
      onSaved({
        ...course,
        title,
        description,
        thumbnailUrl,
        status,
        modules
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    setSaving(true);
    try {
      const { id } = await cloneCourse(course.id);
      router.push(`/content-library/${id}`);
    } catch (err) {
      alert("Failed to clone course.");
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    const { id } = await createModule(course.id, { title: "New Module", sortOrder: modules.length });
    setModules([...modules, { id, title: "New Module", sortOrder: modules.length, lessons: [] }]);
  };

  const removeModule = async (moduleId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    await deleteModule(moduleId);
    setModules(modules.filter(m => m.id !== moduleId));
  };

  const addLesson = async (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const { id } = await createLesson(moduleId, {
      title: "New Lesson",
      contentType: "video",
      contentPayload: { videoUrl: "" },
      sortOrder: mod.lessons.length,
      isPreview: false
    });
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [...m.lessons, {
            id,
            title: "New Lesson",
            contentType: "video",
            contentPayload: { videoUrl: "" },
            sortOrder: m.lessons.length,
            isPreview: false
          }]
        };
      }
      return m;
    }));
  };

  const removeLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;
    await deleteLesson(lessonId);
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
      }
      return m;
    }));
  };

  const updateLessonData = async (moduleId: string, lessonId: string, updates: Partial<ContentLesson>) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
        };
      }
      return m;
    }));
    await updateLesson(lessonId, updates);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 min-w-0">
        <div className={cn(DS_SURFACE_PANEL, "p-5 space-y-4")}>
          {isOfficial && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 border border-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-caption-sm font-medium">Official GlowHomeo Course — Preview Mode</span>
            </div>
          )}
          <label className="block">
            <span className="text-caption-sm font-semibold text-hs-ink">Course Title</span>
            <input disabled={isOfficial} className={cn(DS_FIELD, "mt-1 text-base font-medium", isOfficial && "opacity-75 bg-hs-cream/50")} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-caption-sm font-semibold text-hs-ink">Description</span>
            <textarea disabled={isOfficial} className={cn(DS_FIELD, "mt-1", isOfficial && "opacity-75 bg-hs-cream/50")} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-caption-sm font-semibold text-hs-ink">Thumbnail URL</span>
            <input disabled={isOfficial} className={cn(DS_FIELD, "mt-1", isOfficial && "opacity-75 bg-hs-cream/50")} value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-caption-sm font-semibold text-hs-ink">Status</span>
            <select disabled={isOfficial} className={cn(DS_FIELD, "mt-1", isOfficial && "opacity-75 bg-hs-cream/50")} value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body-sm font-semibold text-hs-ink">Curriculum</h2>
          {!isOfficial && (
            <button type="button" onClick={() => void addModule()} className={DS_BTN_SECONDARY}>
              <Plus className="h-4 w-4 mr-1 inline" aria-hidden />
              Add Module
            </button>
          )}
        </div>

        {modules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-hs-border/40 px-4 py-8 text-center text-body-sm text-hs-text-tertiary">
            No modules yet. Build your curriculum by adding modules and lessons.
          </p>
        ) : (
          <div className="space-y-6">
            {modules.map((m) => (
              <div key={m.id} className={cn(DS_SURFACE_PANEL, "p-4")}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <input
                    className={cn("font-semibold text-hs-ink bg-transparent border-b border-transparent hover:border-hs-border focus:border-hs-primary focus:outline-none px-1", isOfficial && "pointer-events-none opacity-80")}
                    value={m.title}
                    readOnly={isOfficial}
                    onChange={async (e) => {
                      if (isOfficial) return;
                      const newTitle = e.target.value;
                      setModules(modules.map(x => x.id === m.id ? { ...x, title: newTitle } : x));
                      await updateModule(m.id, { title: newTitle });
                    }}
                  />
                  {!isOfficial && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void addLesson(m.id)} className="text-caption-sm text-hs-primary hover:underline">
                        + Add Lesson
                      </button>
                      <button type="button" onClick={() => void removeModule(m.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {m.lessons.length === 0 ? (
                  <p className="text-caption-sm text-hs-text-tertiary p-2 text-center">No lessons in this module.</p>
                ) : (
                  <div className="space-y-3">
                    {m.lessons.map(l => (
                      <div key={l.id} className="border border-hs-border/40 rounded-lg p-3 bg-hs-cream/30 flex items-start gap-3">
                        <div className="mt-1 text-hs-text-tertiary">
                          {l.contentType === 'video' ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                          <input
                            className={cn("font-medium text-caption-sm w-full bg-transparent border-b border-transparent hover:border-hs-border focus:border-hs-primary focus:outline-none", isOfficial && "pointer-events-none opacity-80")}
                            value={l.title}
                            readOnly={isOfficial}
                            onChange={(e) => !isOfficial && updateLessonData(m.id, l.id, { title: e.target.value })}
                          />
                          {l.contentType === 'video' && (
                            <input
                              className={cn(DS_FIELD, "text-[11px] h-7", isOfficial && "opacity-75 bg-hs-cream/50")}
                              placeholder="YouTube URL"
                              disabled={isOfficial}
                              value={l.contentPayload.videoUrl || ""}
                              onChange={(e) => !isOfficial && updateLessonData(m.id, l.id, { contentPayload: { ...l.contentPayload, videoUrl: e.target.value } })}
                            />
                          )}
                        </div>
                        {!isOfficial && (
                          <button type="button" onClick={() => void removeLesson(m.id, l.id)} className="text-hs-text-tertiary hover:text-rose-600 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className={cn(DS_SURFACE_PANEL, "p-4 space-y-3")}>
          {isOfficial ? (
            <button type="button" onClick={() => void handleClone()} disabled={saving} className={cn(DS_BTN_PRIMARY, "w-full bg-emerald-600 hover:bg-emerald-700")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Copy className="h-4 w-4 inline mr-2" />}
              Clone to Edit
            </button>
          ) : (
            <button type="button" onClick={() => void handleSave()} disabled={saving || !title.trim()} className={cn(DS_BTN_PRIMARY, "w-full")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Save className="h-4 w-4 inline mr-2" />}
              Save Course
            </button>
          )}
          <Link href="/content-library" className={cn(DS_BTN_SECONDARY, "w-full block text-center")}>
            Back to library
          </Link>
        </div>
      </aside>
    </div>
  );
}
