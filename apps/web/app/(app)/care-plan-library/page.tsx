"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Copy,
  Loader2,
  Plus,
  Search,
  Star,
  Tags
} from "lucide-react";
import { PageHeader } from "../../../components/platform/PageHeader";
import {
  cloneCarePlan,
  createCarePlan,
  deleteCarePlan,
  fetchCarePlans,
  fetchRecentCarePlans,
  toggleCarePlanFavorite,
  type CarePlanTemplateSummary
} from "../../../lib/doctor-api";
import { CARE_PLAN_CATEGORY_LABELS, type CarePlanPrimaryCategory } from "../../../lib/care-plan-types";
import { cn } from "../../../lib/cn";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY, DS_FIELD_SEARCH, DS_SURFACE_PANEL } from "../../../lib/ds-classes";
import { EmptyState, ErrorState } from "../../../components/ui/LoadState";

export default function CarePlanLibraryPage(): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<CarePlanTemplateSummary[]>([]);
  const [recent, setRecent] = useState<CarePlanTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, rec] = await Promise.all([
        fetchCarePlans({ q: q || undefined, category: category === "all" ? undefined : category, favoritesOnly }),
        fetchRecentCarePlans().catch(() => [] as CarePlanTemplateSummary[])
      ]);
      setItems(list);
      setRecent(rec);
    } catch {
      setError("Could not load care plans. Run the latest database migration if this is a new install.");
    } finally {
      setLoading(false);
    }
  }, [q, category, favoritesOnly]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, CarePlanTemplateSummary[]>();
    for (const it of items) {
      const key = it.primaryCategory;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [items]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { id } = await createCarePlan({
        title: "New care plan",
        primaryCategory: "wellness_plan",
        status: "draft",
        blocks: []
      });
      router.push(`/care-plan-library/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleFavorite = async (id: string, fav: boolean) => {
    await toggleCarePlanFavorite(id, !fav);
    void load();
  };

  const handleClone = async (id: string) => {
    const { id: newId } = await cloneCarePlan(id);
    router.push(`/care-plan-library/${newId}`);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await deleteCarePlan(id);
    void load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Patient Care Plan Library"
        description="Structured, reusable wellness templates for consultations, mobile patient experiences, and future care journeys."
        action={
          <button type="button" onClick={() => void handleCreate()} disabled={creating} className={DS_BTN_PRIMARY}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Plus className="h-4 w-4 inline mr-2" />}
            New care plan
          </button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hs-text-tertiary" aria-hidden />
          <input
            className={DS_FIELD_SEARCH}
            placeholder="Search by title, disease, or summary…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-hs-border/40 bg-hs-paper px-3 py-2.5 text-body-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {(Object.keys(CARE_PLAN_CATEGORY_LABELS) as CarePlanPrimaryCategory[]).map((k) => (
            <option key={k} value={k}>{CARE_PLAN_CATEGORY_LABELS[k]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={cn(
            DS_BTN_SECONDARY,
            favoritesOnly && "border-amber-300 bg-amber-50 text-amber-900"
          )}
        >
          <Star className={cn("h-4 w-4 inline mr-1", favoritesOnly && "fill-amber-500")} />
          Favorites
        </button>
      </div>

      {error ? <ErrorState err={error} onRetry={() => void load()} /> : null}

      {recent.length > 0 && !favoritesOnly && !q ? (
        <section className="mb-8">
          <h2 className="mb-3 text-body-sm font-semibold text-hs-ink">Recently used</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((p) => (
              <Link
                key={p.id}
                href={`/care-plan-library/${p.id}`}
                className="rounded-xl border border-hs-primary/20 bg-hs-primary-very-light/50 px-3 py-2 text-caption-sm font-semibold text-hs-primary hover:bg-hs-primary-very-light"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-hs-primary" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No care plans yet"
          description="Create structured templates once — reuse them in every consultation and future patient apps."
          action={
            <button type="button" onClick={() => void handleCreate()} className={DS_BTN_PRIMARY}>
              Create your first plan
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([cat, plans]) => (
            <section key={cat}>
              <h2 className="mb-3 text-body-sm font-semibold text-hs-ink">
                {CARE_PLAN_CATEGORY_LABELS[cat as CarePlanPrimaryCategory] ?? cat}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p) => (
                  <li key={p.id} className={cn(DS_SURFACE_PANEL, "flex flex-col p-4 transition hover:border-hs-primary/25")}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/care-plan-library/${p.id}`} className="min-w-0 flex-1 group">
                        <p className="font-semibold text-hs-ink group-hover:text-hs-primary truncate">{p.title}</p>
                        {p.summary ? (
                          <p className="mt-1 text-caption-sm text-hs-text-secondary line-clamp-2">{p.summary}</p>
                        ) : null}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleFavorite(p.id, p.isFavorite)}
                        className="shrink-0 p-1 text-hs-text-tertiary hover:text-amber-600"
                        title={p.isFavorite ? "Remove favorite" : "Favorite"}
                      >
                        <Star className={cn("h-4 w-4", p.isFavorite && "fill-amber-500 text-amber-600")} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.diseaseTags.slice(0, 3).map((t) => (
                        <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-hs-cream px-2 py-0.5 text-[10px] font-medium text-hs-text-secondary">
                          <Tags className="h-2.5 w-2.5" />
                          {t}
                        </span>
                      ))}
                      <span className="rounded-full bg-hs-cream px-2 py-0.5 text-[10px] text-hs-text-tertiary">
                        {p.blockCount} blocks
                      </span>
                      {p.status === "draft" ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">Draft</span>
                      ) : null}
                    </div>
                    <div className="mt-auto pt-4 flex gap-2 border-t border-hs-border/20">
                      <Link href={`/care-plan-library/${p.id}`} className="text-caption-sm font-semibold text-hs-primary hover:underline flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button type="button" onClick={() => void handleClone(p.id)} className="text-caption-sm text-hs-text-secondary hover:text-hs-ink flex items-center gap-1">
                        <Copy className="h-3.5 w-3.5" /> Clone
                      </button>
                      {p.isOwn ? (
                        <button type="button" onClick={() => void handleDelete(p.id, p.title)} className="ml-auto text-caption-sm text-rose-600 hover:underline">
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

    </div>
  );
}
