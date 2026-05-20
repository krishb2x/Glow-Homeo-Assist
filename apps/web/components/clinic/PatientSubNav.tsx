"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Calendar, FileText, MessageSquare, Pill, User } from "lucide-react";
import { cn } from "../../lib/cn";

const tabs: Array<{ segment: string; label: string; icon: typeof Calendar; external?: boolean }> = [
  { segment: "timeline", label: "Timeline", icon: Calendar },
  { segment: "profile", label: "Profile & details", icon: User },
  { segment: "prescriptions", label: "Prescriptions", icon: Pill },
  { segment: "documents", label: "Documents & media", icon: FileText },
  { segment: "messages", label: "Messages", icon: MessageSquare, external: true }
];

type Props = { patientId: string };

export function PatientSubNav({ patientId }: Props): JSX.Element {
  const path = usePathname();
  const searchParams = useSearchParams();
  const root = `/patients/${patientId}`;
  const messagesPatientId = searchParams.get("patientId");

  return (
    <nav
      className="mt-3 flex flex-wrap gap-0.5 border-b border-hs-border/60"
      aria-label="Patient record sections"
    >
      {tabs.map((t) => {
        const full = t.external ? `/messages?patientId=${patientId}` : `${root}/${t.segment}`;
        const isActive = t.external
          ? path.startsWith("/messages") && messagesPatientId === patientId
          : path === full;
        return (
          <Link
            key={t.segment}
            href={full}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 border-b-2 px-3 py-2.5 text-body-sm font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-hs-cream",
              isActive
                ? "border-hs-primary text-hs-ink"
                : "border-transparent text-hs-text-secondary hover:text-hs-ink"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <t.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
