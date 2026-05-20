"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Clinic profile and team settings live under Settings. */
export default function ClinicSettingsRedirectPage(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center gap-2 text-body-sm text-hs-text-secondary">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Opening settings…
    </div>
  );
}
