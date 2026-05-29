"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CarePlanEditor } from "../../../../components/care-plans/CarePlanEditor";
import { OfficialTemplatePreview } from "../../../../components/care-plans/OfficialTemplatePreview";
import { PageHeader } from "../../../../components/platform/PageHeader";
import { fetchCarePlan, type CarePlanTemplateDetail } from "../../../../lib/doctor-api";
import { ErrorState } from "../../../../components/ui/LoadState";

export default function CarePlanEditorPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [detail, setDetail] = useState<CarePlanTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchCarePlan(id));
    } catch {
      setError("Care plan not found or API unavailable.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <PageHeader
        title={detail.title}
        description={detail.summary ?? "Structured patient guidance — modular blocks for mobile, PDF, and consultation reuse."}
      />
      {savedMsg ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-caption-sm text-emerald-800">{savedMsg}</p>
      ) : null}
      {detail.templateType === "official" ? (
        <OfficialTemplatePreview template={detail} />
      ) : (
        <CarePlanEditor
          template={detail}
          onSaved={(d) => {
            setDetail(d);
            setSavedMsg("Care plan saved.");
            setTimeout(() => setSavedMsg(null), 3000);
          }}
        />
      )}
    </div>
  );
}
