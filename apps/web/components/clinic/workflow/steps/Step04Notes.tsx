"use client";

import { useState, useEffect } from "react";
import { FileText, ClipboardList, HeartPulse, BrainCircuit, Sparkles, Loader2 } from "lucide-react";
import { StepShell, FieldRow, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type NotesStepValue = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
  observations: string;
  diagnosisThinking: string;
};

type Props = {
  stepNumber: number;
  value: NotesStepValue;
  onChange: (next: NotesStepValue) => void;
  readOnly?: boolean;
  onAiAnalyze?: () => void;
  aiLoading?: boolean;
  aiLastAnalyzedAt?: string | null;
};

export function Step04Notes({ 
  stepNumber, 
  value, 
  onChange, 
  readOnly = false,
  onAiAnalyze,
  aiLoading,
  aiLastAnalyzedAt
}: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<"complaints" | "constitutional" | "assessment">("complaints");

  const set = <K extends keyof NotesStepValue>(key: K, v: NotesStepValue[K]): void =>
    onChange({ ...value, [key]: v });

  // Keyboard shortcut tab switching (Alt+1, Alt+2, Alt+3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        setActiveTab("complaints");
      } else if (e.altKey && e.key === "2") {
        e.preventDefault();
        setActiveTab("constitutional");
      } else if (e.altKey && e.key === "3") {
        e.preventDefault();
        setActiveTab("assessment");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasContent = Object.values(value).some((v) => v.trim().length > 10);

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={FileText}
      title="Clinical assessment"
      description="Document your clinical impression and structured case record. Alt+1/2/3 to switch tabs."
      actions={
        onAiAnalyze && (
          <button
            type="button"
            onClick={onAiAnalyze}
            disabled={readOnly || !hasContent || aiLoading}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-caption-sm font-bold shadow-sm transition",
              !hasContent
                ? "border-hs-border/40 bg-hs-cream/40 text-hs-text-secondary cursor-not-allowed"
                : "border-hs-primary/20 bg-hs-primary-very-light/50 text-hs-primary hover:bg-hs-primary/10"
            )}
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI Analyze
          </button>
        )
      }
    >
      {/* Premium Tab bar navigation */}
      <div className="mb-6 flex gap-1.5 rounded-xl bg-hs-cream/60 p-1 border border-hs-border/30 select-none">
        <button
          type="button"
          onClick={() => setActiveTab("complaints")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-caption-sm font-bold transition-all duration-200",
            activeTab === "complaints"
              ? "bg-white text-hs-primary shadow-sm border border-hs-border/20"
              : "text-hs-text-secondary hover:text-hs-ink hover:bg-white/40"
          )}
        >
          <ClipboardList className="h-4.5 w-4.5" />
          <span>Complaints & Timeline</span>
          <kbd className="hidden sm:inline-block ml-1 opacity-60 text-[9px] font-semibold bg-hs-cream/50 px-1 rounded border border-hs-border/10">Alt+1</kbd>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("constitutional")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-caption-sm font-bold transition-all duration-200",
            activeTab === "constitutional"
              ? "bg-white text-hs-primary shadow-sm border border-hs-border/20"
              : "text-hs-text-secondary hover:text-hs-ink hover:bg-white/40"
          )}
        >
          <HeartPulse className="h-4.5 w-4.5" />
          <span>Mentals & Physicals</span>
          <kbd className="hidden sm:inline-block ml-1 opacity-60 text-[9px] font-semibold bg-hs-cream/50 px-1 rounded border border-hs-border/10">Alt+2</kbd>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("assessment")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-caption-sm font-bold transition-all duration-200",
            activeTab === "assessment"
              ? "bg-white text-hs-primary shadow-sm border border-hs-border/20"
              : "text-hs-text-secondary hover:text-hs-ink hover:bg-white/40"
          )}
        >
          <BrainCircuit className="h-4.5 w-4.5" />
          <span>Observations & Thinking</span>
          <kbd className="hidden sm:inline-block ml-1 opacity-60 text-[9px] font-semibold bg-hs-cream/50 px-1 rounded border border-hs-border/10">Alt+3</kbd>
        </button>
      </div>

      {/* Render active fields based on selected tab */}
      <div className="space-y-4 transition-all duration-300">
        {activeTab === "complaints" && (
          <div className="grid gap-5 sm:grid-cols-2 animate-marketing-hero">
            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Chief Complaints
              </h3>
              <FieldRow label="Patient's presenting complaints" hint="Capture description in the patient's own words.">
                <textarea
                  rows={8}
                  value={value.chiefComplaints}
                  onChange={(e) => set("chiefComplaints", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. Throbbing headache, right side, 6/10 since 3 weeks…"
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[14rem] leading-relaxed")}
                />
              </FieldRow>
            </div>
            
            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Timeline & Progression
              </h3>
              <FieldRow label="Symptom onset and triggers" hint="Describe when symptoms started, triggers, and speed of progression.">
                <textarea
                  rows={8}
                  value={value.timeline}
                  onChange={(e) => set("timeline", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. Started post-Diwali; worse last two weeks. Triggers include fatigue…"
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[14rem] leading-relaxed")}
                />
              </FieldRow>
            </div>
          </div>
        )}

        {activeTab === "constitutional" && (
          <div className="grid gap-5 sm:grid-cols-2 animate-marketing-hero">
            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Mental / Emotional State
              </h3>
              <FieldRow label="Mood, anxiety, dreams, and stressors" hint="Document active mental tendencies, sleep characteristics, and fears.">
                <textarea
                  rows={5}
                  value={value.emotionalState}
                  onChange={(e) => set("emotionalState", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. Anxious, irritable, fear of failure at work, restless sleep…"
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[10rem] leading-relaxed")}
                />
              </FieldRow>
            </div>
            
            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Physical Generals
              </h3>
              <FieldRow label="Appetite, thirst, thermal preferences, excretion" hint="Capture general physical characteristics, cravings, and temperature sensitivities.">
                <textarea
                  rows={5}
                  value={value.physicalSymptoms}
                  onChange={(e) => set("physicalSymptoms", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. Thirstless; cravings for sweets; chilly patient (aggravated by cold)..."
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[10rem] leading-relaxed")}
                />
              </FieldRow>
            </div>

            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200 sm:col-span-2">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Modalities
              </h3>
              <FieldRow
                label="Aggravations & ameliorations"
                hint="Capture environmental modifiers — heat, cold, motion, rest, dampness, time of day."
              >
                <textarea
                  rows={3}
                  value={value.modalities}
                  onChange={(e) => set("modalities", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. < cold drinks, > pressure, < night (10 PM to 2 AM), > lying on right side…"
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[6rem] leading-relaxed")}
                />
              </FieldRow>
            </div>
          </div>
        )}

        {activeTab === "assessment" && (
          <div className="grid gap-5 sm:grid-cols-2 animate-marketing-hero">
            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Doctor's Observations
              </h3>
              <FieldRow
                label="Clinical and behavioral signs"
                hint="Document clinical physical observations, posture, speech patterns, or affect noted."
              >
                <textarea
                  rows={6}
                  value={value.observations}
                  onChange={(e) => set("observations", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. Patient sighs frequently, speaks softly, avoids eye contact…"
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[12rem] leading-relaxed")}
                />
              </FieldRow>
            </div>
            
            <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Differential Thinking
              </h3>
              <FieldRow
                label="Working diagnoses & remedy candidates"
                hint="Document your diagnostic hypotheses, miasmatic analysis, or primary rubrics under review."
              >
                <textarea
                  rows={6}
                  value={value.diagnosisThinking}
                  onChange={(e) => set("diagnosisThinking", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. Suspect Natrum Mur due to emotional reserve; Sepia as differential..."
                  className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[12rem] leading-relaxed")}
                />
              </FieldRow>
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}
