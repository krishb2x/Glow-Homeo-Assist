"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Settings2, FileText, Video, GraduationCap, Archive, Globe } from "lucide-react";
import { PageHeader } from "../../../components/platform/PageHeader";
import {
  fetchOfficialTemplates,
  createOfficialTemplate,
  deleteOfficialTemplate,
  type CarePlanTemplateSummary
} from "../../../lib/doctor-api";
import { cn } from "../../../lib/cn";
import { DS_BTN_PRIMARY, DS_SURFACE_PANEL } from "../../../lib/ds-classes";
import { EmptyState, ErrorState } from "../../../components/ui/LoadState";
import { OfficialTemplateBadge } from "../../../components/care-plans/OfficialTemplateBadge";

type Tab = "care-plans" | "courses" | "videos" | "pdfs";

export default function AdminContentPage(): JSX.Element {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("care-plans");
  const [items, setItems] = useState<CarePlanTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (activeTab !== "care-plans") return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchOfficialTemplates();
      setItems(list);
    } catch {
      setError("Could not load official templates.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateTemplate = async () => {
    setCreating(true);
    try {
      const { id } = await createOfficialTemplate({
        title: "New Official Template",
        primaryCategory: "wellness_plan",
        status: "draft",
        blocks: []
      });
      router.push(`/admin-content/${id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Permanently delete official template "${title}"? This cannot be undone.`)) return;
    try {
      await deleteOfficialTemplate(id);
      void load();
    } catch (e) {
      console.error(e);
      alert("Failed to delete template");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Content Management"
        description="Manage official GlowHomeo content distributed to all clinics."
        action={
          activeTab === "care-plans" && (
            <button type="button" onClick={() => void handleCreateTemplate()} disabled={creating} className={DS_BTN_PRIMARY}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Plus className="h-4 w-4 inline mr-2" />}
              New official template
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="mb-8 border-b border-hs-border/40 overflow-x-auto">
        <nav className="flex space-x-6 min-w-max px-1">
          <button
            onClick={() => setActiveTab("care-plans")}
            className={cn(
              "whitespace-nowrap pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "care-plans"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-hs-text-secondary hover:border-hs-border hover:text-hs-ink"
            )}
          >
            <FileText className="inline-block h-4 w-4 mr-2" />
            Care Plans
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={cn(
              "whitespace-nowrap pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "courses"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-hs-text-secondary hover:border-hs-border hover:text-hs-ink"
            )}
          >
            <GraduationCap className="inline-block h-4 w-4 mr-2" />
            Courses (Coming Soon)
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={cn(
              "whitespace-nowrap pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "videos"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-hs-text-secondary hover:border-hs-border hover:text-hs-ink"
            )}
          >
            <Video className="inline-block h-4 w-4 mr-2" />
            Videos (Coming Soon)
          </button>
        </nav>
      </div>

      {activeTab === "care-plans" && (
        <>
          {error ? <ErrorState err={error} onRetry={() => void load()} /> : null}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-hs-primary" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No official templates"
              description="Create the first official care plan template to distribute to all doctors."
              action={
                <button type="button" onClick={() => void handleCreateTemplate()} className={DS_BTN_PRIMARY}>
                  Create template
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <div key={p.id} className={cn(DS_SURFACE_PANEL, "flex flex-col p-5 hover:border-emerald-500/30 transition-colors group")}>
                  <div className="flex justify-between items-start mb-3">
                    <OfficialTemplateBadge />
                    {p.status === "published" ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Globe className="h-3 w-3" /> Live
                      </span>
                    ) : p.status === "archived" ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                        <Archive className="h-3 w-3" /> Archived
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        <Settings2 className="h-3 w-3" /> Draft
                      </span>
                    )}
                  </div>
                  
                  <Link href={`/admin-content/${p.id}`} className="block mb-4 flex-1">
                    <h3 className="font-semibold text-hs-ink group-hover:text-emerald-700 mb-1">{p.title}</h3>
                    {p.summary && <p className="text-caption-sm text-hs-text-secondary line-clamp-2">{p.summary}</p>}
                  </Link>

                  <div className="pt-4 mt-auto border-t border-hs-border/40 flex justify-between items-center text-xs text-hs-text-tertiary">
                    <span>v{p.version}</span>
                    <div className="flex gap-3">
                      <Link href={`/admin-content/${p.id}`} className="font-medium text-hs-primary hover:underline">
                        Edit
                      </Link>
                      <button onClick={() => void handleDelete(p.id, p.title)} className="font-medium text-rose-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab !== "care-plans" && (
        <div className="py-24 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hs-cream/50 mb-4">
            <Settings2 className="h-6 w-6 text-hs-text-tertiary" />
          </div>
          <h3 className="text-body-md font-semibold text-hs-ink">Coming Soon</h3>
          <p className="mt-1 text-sm text-hs-text-secondary">This section is currently under development.</p>
        </div>
      )}
    </div>
  );
}
