"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPatientJourney, type PatientJourney } from "../../../../../lib/tp-api";
import { PageLoad, PageError } from "../../../../../components/ui/page-states";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../../../lib/cn";
import { BlockRenderer } from "../../../../../components/treatment-programs/BlockRenderer";

export default function PatientJourneyPage() {
  const { assignmentId } = useParams() as { assignmentId: string };
  const [journey, setJourney] = useState<PatientJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { journey: data } = await getPatientJourney(assignmentId);
        setJourney(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load journey"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [assignmentId]);

  if (loading) return <PageLoad />;
  if (error || !journey) return <PageError err={error || new Error("Journey not found")} />;

  const { assignment, blueprint, responses } = journey;
  const currentOffset = assignment.current_day_offset ?? 0;
  const steps = blueprint.steps || [];

  const handleBlockComplete = async (blockId: string, data: Record<string, unknown>) => {
    // In V1, we simulate an optimistic update. The actual POST route is needed in backend.
    // For now, we'll just optimistically update local state.
    setJourney(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        responses: [
          ...prev.responses,
          {
            id: crypto.randomUUID(),
            assignment_id: assignmentId,
            block_id: blockId,
            response_data: data,
            submitted_at: new Date().toISOString()
          }
        ]
      }
    });
    setActiveBlockId(null);
  };

  const completedBlockIds = new Set(responses.map(r => r.block_id));

  return (
    <div className="min-h-screen bg-hs-surface px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        
        <div className="rounded-xl border border-hs-border bg-white p-6 shadow-sm">
          <h1 className="text-heading-lg font-bold text-hs-ink">{blueprint.title}</h1>
          <p className="mt-2 text-body-md text-hs-text-secondary">{blueprint.description || "Your personalized treatment journey."}</p>
          
          <div className="mt-6 flex items-center gap-4 border-t border-hs-border pt-6">
            <div className="flex-1">
              <p className="text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">Status</p>
              <p className="mt-1 text-body-md font-semibold capitalize text-hs-ink">{assignment.status}</p>
            </div>
            <div className="flex-1">
              <p className="text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">Current Day</p>
              <p className="mt-1 text-body-md font-semibold text-hs-ink">Day {currentOffset}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-heading-md font-semibold text-hs-ink">Your Tasks</h2>
          
          <div className="relative border-l-2 border-hs-border/50 pl-6 space-y-10">
            {steps.map((step, index) => {
              const isPast = step.day_offset < currentOffset;
              const isToday = step.day_offset === currentOffset;
              const isFuture = step.day_offset > currentOffset;

              return (
                <div key={step.id || index} className={cn("relative", isFuture && "opacity-60")}>
                  <div className={cn(
                    "absolute -left-[35px] flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white",
                    isPast ? "border-hs-primary bg-hs-primary" : isToday ? "border-hs-primary" : "border-hs-border"
                  )}>
                    {isPast && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  
                  <h3 className={cn("text-body-lg font-semibold", isToday ? "text-hs-primary" : "text-hs-ink")}>
                    Day {step.day_offset}: {step.title}
                  </h3>
                  
                  {isFuture && (
                    <p className="mt-1 text-caption-sm flex items-center gap-1 text-hs-text-tertiary">
                      <Clock className="h-3 w-3" /> Unlocks in {step.day_offset - currentOffset} days
                    </p>
                  )}

                  <div className="mt-4 space-y-3">
                    {step.blocks.map(block => {
                      const isDone = completedBlockIds.has(block.id!);
                      const isActive = activeBlockId === block.id;

                      return (
                        <div 
                          key={block.id}
                          className={cn(
                            "flex flex-col rounded-lg border shadow-sm overflow-hidden",
                            isDone ? "border-green-200 bg-green-50" : "border-hs-border bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => !isFuture && !isDone && setActiveBlockId(isActive ? null : block.id!)}>
                            <div className="flex items-center gap-3">
                              {isDone ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-hs-text-tertiary" />}
                              <div>
                                <p className="text-body-sm font-medium text-hs-ink capitalize">{block.block_type.replace("_", " ")}</p>
                                {block.is_required && <span className="text-xs font-semibold text-red-500">Required</span>}
                              </div>
                            </div>
                            {!isDone && !isFuture && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveBlockId(isActive ? null : block.id!);
                                }}
                                className="flex items-center gap-1 rounded bg-hs-primary/10 px-3 py-1 text-caption-sm font-medium text-hs-primary hover:bg-hs-primary/20"
                              >
                                {isActive ? "Close" : "Start"}
                                {isActive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          
                          {isActive && !isDone && (
                            <div className="border-t border-hs-border bg-hs-surface/30 p-4">
                              <BlockRenderer 
                                block={block} 
                                isDone={isDone} 
                                onComplete={(data) => handleBlockComplete(block.id!, data)} 
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {step.blocks.length === 0 && (
                      <p className="text-caption-sm text-hs-text-tertiary italic">No tasks for this day.</p>
                    )}
                  </div>
                </div>
              );
            })}
            {steps.length === 0 && (
              <p className="text-body-sm text-hs-text-tertiary">Your doctor hasn't added any steps to your journey yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
