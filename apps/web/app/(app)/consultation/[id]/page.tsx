"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { LiveConsultationClient } from "../../../../components/clinic/LiveConsultationClient";
import { SkeletonCard } from "../../../../components/clinic/SkeletonCard";

function LiveConsultationInner(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) {
    return <p className="text-sm text-gh-muted">Invalid consultation.</p>;
  }
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <LiveConsultationClient id={id} />
    </div>
  );
}

export default function LiveConsultationPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <SkeletonCard />
        </div>
      }
    >
      <LiveConsultationInner />
    </Suspense>
  );
}
