"use client";

import { useCallback, useState, useEffect } from "react";
import { Loader2, Plus, Save, Video, BookOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  CARE_PLAN_BLOCK_GROUPS,
  CARE_PLAN_BLOCK_LABELS,
  CARE_PLAN_CATEGORY_LABELS,
  newBlock,
  type CarePlanBlock,
  type CarePlanBlockType,
  type CarePlanPrimaryCategory,
  type CarePlanTemplateDetail
} from "../../lib/care-plan-types";
import {
  createCarePlanMedia,
  resolveYouTubeMetadata,
  updateCarePlan,
  updateOfficialTemplate,
  fetchCourses,
  type ContentCourseSummary,
  type CarePlanMedia
} from "../../lib/doctor-api";
import { CarePlanBlockCard } from "./CarePlanBlockCard";
import { cn } from "../../lib/cn";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY, DS_FIELD, DS_SURFACE_PANEL } from "../../lib/ds-classes";

type Props = {
  template: CarePlanTemplateDetail;
  isAdminMode?: boolean;
  onSaved: (detail: CarePlanTemplateDetail) => void;
};

function tagsFromInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function CarePlanEditor({ template, isAdminMode, onSaved }: Props): JSX.Element {
  const [title, setTitle] = useState(template.title);
  const [summary, setSummary] = useState(template.summary ?? "");
  const [primaryCategory, setPrimaryCategory] = useState<CarePlanPrimaryCategory>(template.primaryCategory);
  const [diseaseTags, setDiseaseTags] = useState(template.diseaseTags.join(", "));
  const [symptomTags, setSymptomTags] = useState(template.symptomTags.join(", "));
  const [status, setStatus] = useState(template.status);
  const [isShared, setIsShared] = useState(template.isShared);
  const [blocks, setBlocks] = useState<CarePlanBlock[]>(template.blocks);
  const [expandedId, setExpandedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState(template.mediaLinks.map((l) => l.media).filter(Boolean) as CarePlanMedia[]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [resolvingYt, setResolvingYt] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  
  const [courseIds, setCourseIds] = useState<string[]>(template.courseIds ?? []);
  const [availableCourses, setAvailableCourses] = useState<ContentCourseSummary[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingCourses(true);
      try {
        const list = await fetchCourses();
        if (active) setAvailableCourses(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoadingCourses(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const moveBlock = (index: number, dir: -1 | 1) => {
    const next = [...blocks];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setBlocks(next.map((b, i) => ({ ...b, sortOrder: i })));
  };

  const addBlock = (blockType: CarePlanBlockType) => {
    const b = newBlock(blockType, blocks.length) as CarePlanBlock;
    setBlocks((prev) => [...prev, b]);
    setExpandedId(b.id);
    setAddBlockOpen(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim() || null,
        primaryCategory,
        diseaseTags: tagsFromInput(diseaseTags),
        symptomTags: tagsFromInput(symptomTags),
        status,
        isShared,
        blocks: blocks.map((b, i) => ({
          id: b.id,
          blockType: b.blockType,
          title: b.title,
          sortOrder: i,
          payload: b.payload
        })),
        mediaLinks: media.map((m, i) => ({ mediaId: m.id, sortOrder: i })),
        courseIds
      };
      
      if (isAdminMode) {
        await updateOfficialTemplate(template.id, payload);
      } else {
        await updateCarePlan(template.id, payload);
      }
      onSaved({
        ...template,
        title,
        summary: summary || null,
        primaryCategory,
        diseaseTags: tagsFromInput(diseaseTags),
        symptomTags: tagsFromInput(symptomTags),
        status,
        isShared,
        blocks,
        courseIds,
        mediaLinks: media.map((m, i) => ({
          mediaId: m.id,
          blockId: null,
          sortOrder: i,
          caption: null,
          media: m
        }))
      });
    } finally {
      setSaving(false);
    }
  }, [
    template,
    title,
    summary,
    primaryCategory,
    diseaseTags,
    symptomTags,
    status,
    isShared,
    blocks,
    media,
    courseIds,
    onSaved,
    isAdminMode
  ]);

  const addYouTube = async () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    setResolvingYt(true);
    try {
      await resolveYouTubeMetadata(url);
      const created = await createCarePlanMedia({ mediaType: "youtube", sourceUrl: url });
      setMedia((m) => [created, ...m]);
      setYoutubeUrl("");
    } finally {
      setResolvingYt(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <div className={cn(DS_SURFACE_PANEL, "p-5 space-y-4")}>
          <label className="block">
            <span className="text-caption-sm font-semibold text-hs-ink">Plan title</span>
            <input className={cn(DS_FIELD, "mt-1 text-base font-medium")} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-caption-sm font-semibold text-hs-ink">Summary</span>
            <textarea className={cn(DS_FIELD, "mt-1")} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description for library search and mobile cards" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-caption-sm font-medium text-hs-text-secondary">Category</span>
              <select className={cn(DS_FIELD, "mt-1")} value={primaryCategory} onChange={(e) => setPrimaryCategory(e.target.value as CarePlanPrimaryCategory)}>
                {(Object.keys(CARE_PLAN_CATEGORY_LABELS) as CarePlanPrimaryCategory[]).map((k) => (
                  <option key={k} value={k}>{CARE_PLAN_CATEGORY_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-caption-sm font-medium text-hs-text-secondary">Status</span>
              <select className={cn(DS_FIELD, "mt-1")} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-caption-sm font-medium text-hs-text-secondary">Disease tags (comma-separated)</span>
            <input className={cn(DS_FIELD, "mt-1")} value={diseaseTags} onChange={(e) => setDiseaseTags(e.target.value)} placeholder="migraine, gastritis, pcod" />
          </label>
          <label className="block">
            <span className="text-caption-sm font-medium text-hs-text-secondary">Symptom tags</span>
            <input className={cn(DS_FIELD, "mt-1")} value={symptomTags} onChange={(e) => setSymptomTags(e.target.value)} placeholder="headache, bloating, fatigue" />
          </label>
          <label className="flex items-center gap-2 text-body-sm">
            <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="rounded border-hs-border" />
            Share with clinic doctors
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body-sm font-semibold text-hs-ink">Content blocks</h2>
          <div className="relative">
            <button type="button" onClick={() => setAddBlockOpen((v) => !v)} className={DS_BTN_SECONDARY}>
              <Plus className="h-4 w-4 mr-1 inline" aria-hidden />
              Add block
            </button>
            {addBlockOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl border border-hs-border/50 bg-hs-paper shadow-ds-md p-2">
                {CARE_PLAN_BLOCK_GROUPS.map((g) => (
                  <div key={g.label} className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase text-hs-text-tertiary">{g.label}</p>
                    {g.types.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="w-full rounded-lg px-2 py-1.5 text-left text-caption-sm hover:bg-hs-cream"
                        onClick={() => addBlock(t)}
                      >
                        {CARE_PLAN_BLOCK_LABELS[t]}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {blocks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-hs-border/40 px-4 py-8 text-center text-body-sm text-hs-text-tertiary">
            No blocks yet. Add diet, lifestyle, FAQs, or other modular sections.
          </p>
        ) : (
          <div className="space-y-3">
            {blocks.map((b, i) => (
              <CarePlanBlockCard
                key={b.id}
                block={b}
                expanded={expandedId === b.id}
                onToggle={() => setExpandedId((id) => (id === b.id ? null : b.id))}
                onChange={(next) => setBlocks((prev) => prev.map((x) => (x.id === b.id ? next : x)))}
                onRemove={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
                onMoveUp={() => moveBlock(i, -1)}
                onMoveDown={() => moveBlock(i, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < blocks.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className={cn(DS_SURFACE_PANEL, "p-4 space-y-3")}>
          <button type="button" onClick={() => void handleSave()} disabled={saving || !title.trim()} className={cn(DS_BTN_PRIMARY, "w-full")}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Save className="h-4 w-4 inline mr-2" />}
            Save plan
          </button>
          <Link href="/care-plan-library" className={cn(DS_BTN_SECONDARY, "w-full block text-center")}>
            Back to library
          </Link>
          <p className="text-[10px] text-hs-text-tertiary">
            v{template.version} · {template.blockCount} blocks · Used {template.usageCount}×
          </p>
        </div>
        <div className={cn(DS_SURFACE_PANEL, "p-4 space-y-3")}>
          <p className="text-caption-sm font-semibold text-hs-ink flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-hs-primary" aria-hidden />
            Assigned Courses
          </p>
          <div className="flex flex-col gap-2">
            {loadingCourses ? (
              <p className="text-[10px] text-hs-text-tertiary">Loading courses...</p>
            ) : availableCourses.length === 0 ? (
              <p className="text-[10px] text-hs-text-tertiary">No courses available.</p>
            ) : (
              <select
                className={cn(DS_FIELD, "text-[11px] py-1.5")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !courseIds.includes(val)) {
                    setCourseIds([...courseIds, val]);
                  }
                  e.target.value = "";
                }}
                defaultValue=""
              >
                <option value="" disabled>Add course...</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id} disabled={courseIds.includes(c.id)}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          {courseIds.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {courseIds.map((cid) => {
                const c = availableCourses.find(x => x.id === cid);
                return (
                  <li key={cid} className="flex items-center justify-between gap-2 rounded-md border border-hs-border/30 px-2 py-1.5 bg-hs-cream/30">
                    <span className="text-[11px] font-medium truncate">{c?.title ?? "Loading..."}</span>
                    <button type="button" onClick={() => setCourseIds(courseIds.filter(id => id !== cid))} className="text-hs-text-tertiary hover:text-rose-600 shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={cn(DS_SURFACE_PANEL, "p-4 space-y-3")}>
          <p className="text-caption-sm font-semibold text-hs-ink flex items-center gap-1.5">
            <Video className="h-4 w-4 text-rose-600" aria-hidden />
            Media library
          </p>
          <div className="flex gap-2">
            <input
              className={cn(DS_FIELD, "flex-1 text-caption-sm")}
              placeholder="YouTube URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
            <button type="button" onClick={() => void addYouTube()} disabled={resolvingYt} className={DS_BTN_SECONDARY}>
              {resolvingYt ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {media.map((m) => (
              <li key={m.id} className="flex gap-2 rounded-lg border border-hs-border/30 p-2">
                {m.thumbnailUrl ? (
                  <img src={m.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover shrink-0" />
                ) : null}
                <div className="min-w-0">
                  <p className="text-caption-sm font-medium truncate">{m.title}</p>
                  {m.channelName ? <p className="text-[10px] text-hs-text-tertiary truncate">{m.channelName}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
