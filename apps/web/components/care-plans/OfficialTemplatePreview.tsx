"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Copy, Loader2, PlayCircle, Clock } from "lucide-react";
import type { CarePlanTemplateDetail } from "../../lib/doctor-api";
import { cloneCarePlan } from "../../lib/doctor-api";
import { OfficialTemplateBadge } from "./OfficialTemplateBadge";
import { DS_BTN_PRIMARY, DS_SURFACE_PANEL } from "../../lib/ds-classes";
import { CARE_PLAN_BLOCK_LABELS } from "../../lib/care-plan-types";

export function OfficialTemplatePreview({
  template
}: {
  template: CarePlanTemplateDetail;
}): JSX.Element {
  const router = useRouter();
  const [cloning, setCloning] = useState(false);

  const handleUseTemplate = async () => {
    setCloning(true);
    try {
      const { id } = await cloneCarePlan(template.id, template.title);
      router.push(`/care-plan-library/${id}`);
    } catch (e) {
      console.error(e);
      setCloning(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 sm:p-8 ring-1 ring-emerald-100">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <OfficialTemplateBadge className="mb-4" />
            <h1 className="text-2xl font-bold text-hs-ink sm:text-3xl">{template.title}</h1>
            {template.summary ? (
              <p className="mt-3 text-body-md text-hs-text-secondary leading-relaxed">
                {template.summary}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              {template.diseaseTags.map((t) => (
                <span key={t} className="rounded-md bg-white/60 px-2 py-1 text-xs font-medium text-hs-text-secondary ring-1 ring-black/5">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => void handleUseTemplate()}
              disabled={cloning}
              className={DS_BTN_PRIMARY + " w-full sm:w-auto shadow-emerald-500/20"}
            >
              {cloning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Use This Template
            </button>
            <p className="mt-2 text-center text-[11px] text-hs-text-tertiary">
              Creates a personal copy you can edit
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-hs-ink">Template Content</h2>
        
        {template.blocks.map((block) => {
          const items = Array.isArray(block.payload?.items) ? block.payload.items : [];
          const faqs = Array.isArray(block.payload?.faqs) ? block.payload.faqs : [];
          const tasks = Array.isArray(block.payload?.tasks) ? block.payload.tasks : [];
          
          return (
            <div key={block.id} className={DS_SURFACE_PANEL + " p-5"}>
              <div className="mb-4 border-b border-hs-border/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-hs-cream px-1.5 py-0.5 text-[10px] font-medium text-hs-text-tertiary">
                    {CARE_PLAN_BLOCK_LABELS[block.blockType] ?? block.blockType}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-hs-ink">
                  {block.title || "Untitled Block"}
                </h3>
                {typeof block.payload?.intro === "string" && block.payload.intro ? (
                  <p className="mt-2 text-body-sm text-hs-text-secondary">
                    {block.payload.intro}
                  </p>
                ) : null}
              </div>

              {items.length > 0 ? (
                <ul className="space-y-3">
                  {items.map((it: any) => (
                    <li key={it.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <div>
                        <span className="text-body-sm text-hs-ink">{it.text}</span>
                        {it.note ? (
                          <p className="mt-0.5 text-caption-sm text-hs-text-tertiary">{it.note}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {faqs.length > 0 ? (
                <div className="space-y-4">
                  {faqs.map((f: any) => (
                    <div key={f.id} className="rounded-lg bg-hs-cream/30 p-3">
                      <p className="font-medium text-body-sm text-hs-ink">Q: {f.question}</p>
                      <p className="mt-1 text-body-sm text-hs-text-secondary">{f.answer}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {tasks.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {tasks.map((t: any) => (
                    <li key={t.id} className="flex items-start gap-3 rounded-xl border border-hs-border/40 bg-white p-3">
                      <div className="mt-0.5 shrink-0 text-hs-text-tertiary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-body-sm text-hs-ink">{t.title}</p>
                        {t.description ? <p className="text-caption-sm text-hs-text-secondary">{t.description}</p> : null}
                        {t.frequency || t.timeOfDay ? (
                          <div className="mt-2 flex gap-2">
                            {t.frequency && <span className="rounded bg-hs-cream px-1.5 py-0.5 text-[10px] text-hs-text-tertiary">{t.frequency}</span>}
                            {t.timeOfDay && <span className="rounded bg-hs-cream px-1.5 py-0.5 text-[10px] text-hs-text-tertiary">{t.timeOfDay}</span>}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}

        {template.courseIds && template.courseIds.length > 0 ? (
          <div className={DS_SURFACE_PANEL + " p-5"}>
            <h3 className="text-base font-semibold text-hs-ink">Assigned Courses</h3>
            <p className="text-caption-sm text-hs-text-secondary mb-4">This template includes {template.courseIds.length} course{template.courseIds.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg w-fit font-medium">
              <BookOpen className="h-4 w-4" /> Courses will be linked when cloned
            </div>
          </div>
        ) : null}

        {template.mediaLinks && template.mediaLinks.length > 0 ? (
          <div className={DS_SURFACE_PANEL + " p-5"}>
            <h3 className="text-base font-semibold text-hs-ink">Media Attachments</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {template.mediaLinks.map((ml) => (
                <div key={ml.mediaId} className="flex items-center gap-3 rounded-lg border border-hs-border/40 p-3">
                  <PlayCircle className="h-8 w-8 text-hs-text-tertiary shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-hs-ink">{ml.media?.title || "Attached Media"}</p>
                    {ml.caption && <p className="truncate text-caption-sm text-hs-text-secondary">{ml.caption}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
