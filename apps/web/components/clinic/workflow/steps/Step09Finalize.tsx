"use client";



import { AlertCircle, CheckCircle2, Circle, FileSignature } from "lucide-react";

import type { ReactNode } from "react";

import type { ConsultationStep } from "../../../../lib/clinical-workflow-config";

import { StepShell } from "./StepShell";

import { cn } from "../../../../lib/cn";



export type FinalizeSummaryItem = {

  id: string;

  label: string;

  status: "done" | "missing" | "warn";

  hint?: string;

  step?: ConsultationStep;

};



type Props = {

  stepNumber: number;

  items: FinalizeSummaryItem[];

  alreadyFinalized: boolean;

  finalizing: boolean;

  blockedReason?: string;

  outcomeSlot?: ReactNode;

  onGoToStep?: (step: ConsultationStep) => void;

  /** Deprecated — canonical Finalize action lives in the step extras panel. */

  onFinalize?: () => void;

  onDownloadPdf?: () => void;

  onPreviewPdf?: () => void;

};



/**

 * Pre-flight checklist + finalized badge. The "Finalize & send" CTA itself

 * lives in the step extras panel below, where send options (WhatsApp/Email)

 * are configured. Step09 is the status view; extras is the action zone.

 */

export function Step09Finalize({

  stepNumber,

  items,

  alreadyFinalized,

  blockedReason,

  outcomeSlot,

  onGoToStep

}: Props): JSX.Element {

  return (

    <StepShell

      stepNumber={stepNumber}

      icon={FileSignature}

      title="Complete visit"

      description="Review the record, then finalize and send below."

      status={alreadyFinalized ? "done" : "active"}

      actions={

        alreadyFinalized ? (

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-caption-sm font-bold text-emerald-900">

            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />

            Finalized

          </span>

        ) : null

      }

    >

      <div className="space-y-4">

        <p className="text-[0.9375rem] text-neutral-600">

          When you are ready, use the actions below to sign and send the prescription.

        </p>

        <ul className="space-y-2">

          {items.map((i) => {

            const Icon =

              i.status === "done" ? CheckCircle2 : i.status === "warn" ? Circle : AlertCircle;

            const iconClass =

              i.status === "done"

                ? "text-emerald-600"

                : i.status === "warn"

                  ? "text-amber-500"

                  : "text-rose-500";

            const content = (

              <>

                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden />

                <span className="min-w-0 flex-1">

                  <span

                    className={cn(

                      "block text-[0.8125rem] font-medium",

                      i.status === "done" ? "text-neutral-700" : "text-neutral-900"

                    )}

                  >

                    {i.label}

                  </span>

                  {i.hint ? (

                    <span className="mt-0.5 block text-[0.75rem] text-neutral-500">{i.hint}</span>

                  ) : null}

                </span>

              </>

            );

            if (i.status !== "done" && i.step && onGoToStep) {

              return (

                <li key={i.id}>

                  <button

                    type="button"

                    onClick={() => onGoToStep(i.step!)}

                    className="flex w-full items-start gap-2.5 rounded-lg border border-neutral-200/80 bg-white px-3 py-2 text-left transition hover:border-hs-primary/30 hover:bg-hs-primary-very-light/20"

                  >

                    {content}

                    <span className="shrink-0 text-[0.6875rem] font-semibold text-hs-primary">Go →</span>

                  </button>

                </li>

              );

            }

            return (

              <li key={i.id} className="flex items-start gap-2.5 px-1 py-0.5">

                {content}

              </li>

            );

          })}

        </ul>

        {blockedReason && !alreadyFinalized ? (

          <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[0.8125rem] text-amber-950">

            {blockedReason}

          </p>

        ) : null}



        {outcomeSlot ? <div className="pt-1">{outcomeSlot}</div> : null}

      </div>

    </StepShell>

  );

}


