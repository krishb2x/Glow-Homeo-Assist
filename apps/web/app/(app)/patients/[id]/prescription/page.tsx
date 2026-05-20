"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Legacy route — prescriptions are created inside a live consultation. */
export default function PrescriptionRedirectPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  useEffect(() => {
    if (id) {
      router.replace(`/consultation?patientId=${encodeURIComponent(id)}`);
    } else {
      router.replace("/consultation");
    }
  }, [id, router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center gap-2 text-body-sm text-hs-text-secondary">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Opening consultation…
    </div>
  );
}
