"use client";

import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldCheck,
  RotateCcw,
  BookOpen
} from "lucide-react";
import { BRAND_NAME } from "../../lib/brand";

interface NoteState {
  complaint: string;
  modalities: string[];
  constitutional: string;
  miasm: string;
  remedySuggestions: string[];
}

interface CaseStudy {
  id: string;
  title: string;
  summary: string;
  rawSymptoms: string[];
  synthesis: NoteState;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "case-a",
    title: "Case Study: Periodic Hemicrania",
    summary: "A 34-year-old female presenting with severe, throbbing right-sided headaches periodically.",
    rawSymptoms: [
      "Severe throbbing headache in the right temporal region.",
      "Aggravated by bright direct afternoon sunlight, heat, and physical motion.",
      "Ameliorated by absolute quiet, pitch darkness, and cool, damp compresses."
    ],
    synthesis: {
      complaint: "Severe, throbbing hemicrania (right-sided headache) in the temporal region.",
      modalities: [
        "Aggravation: Bright afternoon sunlight, heat, motion",
        "Amelioration: Quiet, dark room, cool damp application"
      ],
      constitutional: "Pulsatilla / Sanguinaria indications (chilly, amel quiet/cool)",
      miasm: "Psora-Sycosic (functional congestion with periodic flare-ups)",
      remedySuggestions: ["Sanguinaria 200C", "Belladonna 30C", "Spigelia 200C"]
    }
  },
  {
    id: "case-b",
    title: "Case Study: Wandering Rheumatic Modalities",
    summary: "A 45-year-old male with shifting joint pain aggravated by first motion but relieved by continuous movement.",
    rawSymptoms: [
      "Rheumatic joint pain that shifts rapidly from joint to joint.",
      "Severe pain on beginning to move, but decreases significantly upon continuous walking.",
      "Aggravated by cold, damp weather and winter winds; ameliorated by warmth and dry climate."
    ],
    synthesis: {
      complaint: "Erratic, wandering articular rheumatism (shifting joint pains).",
      modalities: [
        "Aggravation: Beginning motion, cold damp weather, winter winds",
        "Amelioration: Continued walking, warm dry climate, local heat"
      ],
      constitutional: "Rhus Toxicodendron / Pulsatilla constitutional indications",
      miasm: "Psora-Syphilitic (tissue irritation aggravated by climatic changes)",
      remedySuggestions: ["Rhus Toxicodendron 200C", "Pulsatilla 30C", "Kalmia Latifolia 200C"]
    }
  }
];

export function ClinicalSimulator(): JSX.Element {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [structuredNotes, setStructuredNotes] = useState<NoteState | null>(null);

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setStructuredNotes(null);
    setActiveStep(1);
  };

  const handleProcessSynthesis = () => {
    if (!selectedCaseId) return;
    setIsProcessing(true);
    setActiveStep(1);

    const activeCase = CASE_STUDIES.find((c) => c.id === selectedCaseId);
    if (!activeCase) return;

    // Simulate database lookup/mapping latency
    setTimeout(() => {
      setStructuredNotes(activeCase.synthesis);
      setIsProcessing(false);
      setActiveStep(2);
    }, 700);
  };

  const handleReset = () => {
    setSelectedCaseId("");
    setStructuredNotes(null);
    setActiveStep(1);
  };

  const currentCase = CASE_STUDIES.find((c) => c.id === selectedCaseId);

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/20 to-slate-50/60 p-5 shadow-xl shadow-slate-900/5 sm:p-8">
      {/* Background Decorative Glow */}
      <div className="pointer-events-none absolute -left-8 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-hs-primary-very-light/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-emerald-100/10 blur-3xl" />

      {/* Header Info */}
      <div className="relative z-10 mb-8 flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
        <div>
          <h3 className="font-heading mt-0 text-balance text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
            Experience the {BRAND_NAME} Intake Engine
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
            See how our structured repertorization engine seamlessly parses clinical symptom sheets and matches rubrics, modalities, and miasms in seconds.
          </p>
        </div>

        {/* Multi-step progress tracker */}
        <div className="flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-slate-200/50 backdrop-blur-sm self-start md:self-auto">
          {[
            { id: 1, label: "Select" },
            { id: 2, label: "Synthesize" },
            { id: 3, label: "Rx Ready" }
          ].map((step) => (
            <div key={step.id} className="flex items-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  activeStep === step.id
                    ? "bg-hs-primary text-white ring-4 ring-hs-primary-very-light"
                    : activeStep > step.id
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {activeStep > step.id ? "✓" : step.id}
              </span>
              <span className={`ml-1.5 text-xs font-semibold mr-1.5 ${
                activeStep === step.id ? "text-hs-primary" : "text-slate-400"
              }`}>
                {step.label}
              </span>
              {step.id < 3 && <ArrowRight className="h-3 w-3 text-slate-300 mr-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 grid gap-6 md:grid-cols-12">
        {/* Left column: Structured Symptom Picker (5 columns) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.02)] md:col-span-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Symptom Intake Card
            </span>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Select a Case Presentation:</label>
              <div className="space-y-2">
                {CASE_STUDIES.map((cs) => (
                  <button
                    key={cs.id}
                    onClick={() => handleSelectCase(cs.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition duration-200 ${
                      selectedCaseId === cs.id
                        ? "border-hs-primary bg-hs-primary-very-light/35 font-semibold text-hs-primary-dark shadow-[0_2px_8px_-2px_rgba(14,124,102,0.15)]"
                        : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {cs.title}
                    </div>
                    <p className="mt-1 text-[11px] font-normal leading-normal text-slate-500">{cs.summary}</p>
                  </button>
                ))}
              </div>
            </div>

            {currentCase && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mt-3 animate-fadeIn">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chief Symptoms Received</span>
                <ul className="mt-2 space-y-2">
                  {currentCase.rawSymptoms.map((sym, index) => (
                    <li key={index} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-hs-primary shrink-0 mt-1.5" />
                      <p className="leading-relaxed">{sym}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={handleProcessSynthesis}
              disabled={!selectedCaseId || isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-hs-primary px-5 py-3 text-xs font-bold text-white shadow-[0_4px_12px_-2px_rgba(14,124,102,0.3)] transition hover:bg-hs-primary-dark disabled:opacity-50"
            >
              {isProcessing ? "Synthesizing..." : "Analyze Modalities & Rubrics"}
            </button>
            {selectedCaseId && (
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition"
                title="Reset Sandbox"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right column: Homeopathic Synthesis Panel (7 columns) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-[#E5F1EE]/30 p-5 shadow-[0_4px_16px_rgba(14,124,102,0.02)] md:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200/40 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-hs-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-hs-primary" />
              Structured Case Synthesis
            </span>
            <span className="text-[10px] font-bold text-slate-400">{BRAND_NAME} Repertory Engine</span>
          </div>

          <div className="flex-1 space-y-4">
            {structuredNotes ? (
              <div className="space-y-4">
                {/* Chief Complaint */}
                <div className="animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synthesized Chief Complaint</span>
                  <div className="mt-1 flex items-start gap-2 rounded-lg bg-white border border-slate-100 p-2.5">
                    <span className="mt-0.5 rounded-full bg-red-100 p-0.5 text-red-600">
                      <Zap className="h-3 w-3" />
                    </span>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">{structuredNotes.complaint}</p>
                  </div>
                </div>

                {/* Modalities */}
                <div className="animate-fadeIn" style={{ animationDelay: "0.1s" }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modalities Mapping</span>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                    {structuredNotes.modalities.map((mod, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-2 text-[11px] leading-relaxed font-semibold bg-white ${
                          mod.startsWith("Agg")
                            ? "border-red-100/80 text-red-800"
                            : "border-emerald-100/80 text-emerald-800"
                        }`}
                      >
                        {mod}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Classification Details */}
                <div className="grid gap-3 sm:grid-cols-2 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Miasm Classification</span>
                    <span className="mt-1.5 flex items-center justify-between rounded-lg bg-emerald-50/60 border border-emerald-100 px-3 py-2 text-xs font-bold text-hs-success">
                      {structuredNotes.miasm}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Constitutional Indication</span>
                    <span className="mt-1.5 flex items-center justify-between rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
                      {structuredNotes.constitutional}
                    </span>
                  </div>
                </div>

                {/* Differential Suggestion */}
                <div className="animate-fadeIn" style={{ animationDelay: "0.3s" }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Remedy Repertory Suggestion</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {structuredNotes.remedySuggestions.map((rem, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-hs-primary/30 px-3.5 py-1 text-xs font-extrabold text-hs-primary shadow-[0_1px_3px_rgba(14,124,102,0.06)]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                        {rem}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center py-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileText className="h-5.5 w-5.5" />
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500 font-heading">Structured Repertory Analysis</p>
                <p className="mt-1 text-[11px] text-slate-400 max-w-[240px]">
                  Select a case study and click analyze to view mapped rubrics, modalities, miasms, and constitutional remedies.
                </p>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          {structuredNotes && activeStep === 2 && (
            <button
              onClick={() => setActiveStep(3)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-hs-secondary px-5 py-3 text-xs font-bold text-white shadow-[0_4px_12px_rgba(212,165,116,0.3)] transition hover:bg-hs-secondary-dark"
            >
              Compile & Sign Professional Prescription
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Final Step: Rx PDF generated successfully */}
          {activeStep === 3 && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-white p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Rx Signature Compiled Successfully!</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                    A clean, professional prescription PDF containing MCI registration metadata and signature was delivered directly to the patient's companion app and clinic record.
                  </p>
                  <button
                    onClick={() => setActiveStep(2)}
                    className="mt-2.5 text-[10px] font-bold text-hs-primary hover:underline flex items-center gap-1"
                  >
                    ← Back to Case Notes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Footnote */}
      <div className="relative z-10 mt-6 flex flex-col justify-between gap-3 border-t border-slate-200/50 pt-4 text-[10.5px] text-slate-400 sm:flex-row sm:items-center">
        <p className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-hs-primary" />
          HIPAA & GDPR Ready architecture. Clinical database records are encrypted and kept confidential.
        </p>
        <p className="font-semibold text-slate-500">
          Used by 240+ BHMS & MD Hom Clinics
        </p>
      </div>
    </div>
  );
}
