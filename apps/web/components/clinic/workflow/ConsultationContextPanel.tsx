"use client";

import { ConsultationMemoStrip } from "../memos/ConsultationMemoStrip";
import { ConsultationPastVisitsPanel } from "./ConsultationPastVisitsPanel";
import { DailyConsultationVideo } from "../video/DailyConsultationVideo";

type Props = {
  mode: "IN_CLINIC" | "ONLINE";
  patientId: string;
  consultationId: string;
  /** When true, video is shown in the main shell rail — drawer shows memos only. */
  videoInRail?: boolean;
};

/** Progressive disclosure: memos, prior visits, video — not inline in the main workflow. */
export function ConsultationContextPanel({
  mode,
  patientId,
  consultationId,
  videoInRail = false
}: Props): JSX.Element {
  return (
    <div className="space-y-0">
      <ConsultationMemoStrip patientId={patientId} consultationId={consultationId} />
      {mode === "ONLINE" && !videoInRail ? (
        <div className="border-t border-black/[0.06] p-4">
          <DailyConsultationVideo consultationId={consultationId} />
        </div>
      ) : mode === "ONLINE" && videoInRail ? (
        <div className="border-t border-black/[0.06] p-4 text-caption-sm text-neutral-500">
          Video is active above your chart. Copy the patient link or admit from the video panel.
        </div>
      ) : (
        <div className="border-t border-black/[0.06]">
          <ConsultationPastVisitsPanel patientId={patientId} currentConsultationId={consultationId} />
        </div>
      )}
    </div>
  );
}
