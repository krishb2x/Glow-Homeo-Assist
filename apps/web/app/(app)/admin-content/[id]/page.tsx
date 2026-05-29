"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Globe, Archive } from "lucide-react";
import { CarePlanEditor } from "../../../../components/care-plans/CarePlanEditor";
import { PageHeader } from "../../../../components/platform/PageHeader";
import { 
  fetchOfficialTemplate, 
  publishOfficialTemplate, 
  archiveOfficialTemplate,
  type CarePlanTemplateDetail 
} from "../../../../lib/doctor-api";
import { ErrorState } from "../../../../components/ui/LoadState";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY } from "../../../../lib/ds-classes";

export default function AdminOfficialTemplateEditorPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  
  const [detail, setDetail] = useState<CarePlanTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchOfficialTemplate(id));
    } catch {
      setError("Template not found or API unavailable.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublish = async () => {
    if (!detail) return;
    if (!confirm("Publish this official template? It will be immediately visible to all doctors.")) return;
    setActionLoading(true);
    try {
      await publishOfficialTemplate(detail.id);
      setSavedMsg("Template published successfully.");
      setTimeout(() => setSavedMsg(null), 3000);
      void load();
    } catch (e) {
      console.error(e);
      alert("Failed to publish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!detail) return;
    if (!confirm("Archive this official template? It will be hidden from the library, but existing doctor copies will be unaffected.")) return;
    setActionLoading(true);
    try {
      await archiveOfficialTemplate(detail.id);
      setSavedMsg("Template archived.");
      setTimeout(() => setSavedMsg(null), 3000);
      void load();
    } catch (e) {
      console.error(e);
      alert("Failed to archive");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-hs-primary" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState err={error ?? "Not found"} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 text-sm font-medium text-hs-text-tertiary flex gap-2 items-center">
        <span>Admin Content</span>
        <span>/</span>
        <span className="text-hs-ink">{detail.title}</span>
      </div>

      <PageHeader
        title={detail.title}
        description={`Status: ${detail.status.toUpperCase()} • Version: ${detail.version}`}
        action={
          <>
            {detail.status !== "published" && (
              <button 
                onClick={() => void handlePublish()} 
                disabled={actionLoading}
                className={DS_BTN_PRIMARY + " bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"}
              >
                <Globe className="mr-2 h-4 w-4" />
                Publish
              </button>
            )}
            {detail.status !== "archived" && (
              <button 
                onClick={() => void handleArchive()}
                disabled={actionLoading}
                className={DS_BTN_SECONDARY + " text-rose-600 hover:border-rose-300 hover:bg-rose-50"}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </button>
            )}
          </>
        }
      />
      
      {savedMsg ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-caption-sm text-emerald-800">{savedMsg}</p>
      ) : null}
      
      {/* 
        We reuse CarePlanEditor here. Since we pass the official template, 
        we should theoretically use a specialized AdminCarePlanEditor if we wanted 
        to use the admin update endpoints (updateOfficialTemplate vs updateCarePlan).
        
        However, for the sake of this implementation, we can just intercept the save
        or let the regular CarePlanEditor use `updateCarePlanTemplate` which will fail
        due to RLS (clinic mismatch) unless it's an admin route.
        
        Let's modify CarePlanEditor to accept an `isAdmin` prop or a custom update function
        if needed, but for now we'll assume the API intercepts it or the admin is in the right clinic.
        Actually, the `updateCarePlanTemplate` in service checks `clinicId` from claims. 
        We should really pass a prop to CarePlanEditor to tell it to use `updateOfficialTemplate`.
      */}
      
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
        <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Official Template Editor</p>
          <p className="text-xs text-blue-700 mt-1">
            Changes made here will affect the source template. Doctors who have already cloned this template will not see these changes automatically.
          </p>
        </div>
      </div>

      <CarePlanEditor
        template={detail}
        isAdminMode={true}
        onSaved={(d) => {
          setDetail(d);
          setSavedMsg("Template saved.");
          setTimeout(() => setSavedMsg(null), 3000);
        }}
      />
    </div>
  );
}
