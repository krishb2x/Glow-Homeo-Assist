import { useState } from "react";
import type { TpProgram, TpStep, TpBlock } from "../../lib/tp-api";
import { Plus, GripVertical, Settings2, Trash2, FileText, Activity, MessageCircle, Video } from "lucide-react";
import { cn } from "../../lib/cn";
import { fetchPatients } from "../../lib/doctor-api";
import { assignPatientToProgram } from "../../lib/tp-api";
import { useRouter } from "next/navigation";

// Dummy icons for block types
const BLOCK_ICONS: Record<string, React.ReactNode> = {
  rich_text: <FileText className="h-4 w-4" />,
  mcq_form: <MessageCircle className="h-4 w-4" />,
  weight_tracker: <Activity className="h-4 w-4" />,
  youtube_video: <Video className="h-4 w-4" />
};

export function ProgramBuilder({ initialProgram }: { initialProgram: TpProgram }) {
  const router = useRouter();
  const [program, setProgram] = useState<TpProgram>(initialProgram);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const steps = program.steps || [];

  const handleTestEnroll = async () => {
    try {
      setEnrolling(true);
      const patients = await fetchPatients(1);
      if (patients.length === 0) {
        alert("No patients found in this clinic.");
        setEnrolling(false);
        return;
      }
      const p = patients[0];
      const { assignment } = await assignPatientToProgram(p.id, program.id);
      alert(`Assigned ${p.name} to program! Check patient journey view.`);
      router.push(`/patient/${p.id}/journey/${assignment.id}`);
    } catch (err) {
      alert("Failed to enroll patient: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="flex h-full w-full gap-4 pt-4">
      
      {/* LEFT: Block Palette */}
      <div className="w-64 shrink-0 rounded-xl border border-hs-border bg-hs-surface p-4 flex flex-col gap-4 overflow-y-auto">
        <h3 className="text-body-md font-semibold text-hs-ink">Block Palette</h3>
        <p className="text-caption-sm text-hs-text-secondary">Drag blocks into the timeline.</p>
        
        <div className="space-y-2">
          {["rich_text", "mcq_form", "weight_tracker", "youtube_video"].map((type) => (
            <div key={type} className="flex cursor-grab items-center gap-2 rounded-lg border border-hs-border/50 bg-hs-paper p-2 shadow-sm hover:border-hs-primary/50 hover:bg-hs-primary/5">
              <GripVertical className="h-4 w-4 text-hs-text-tertiary" />
              {BLOCK_ICONS[type]}
              <span className="text-body-sm capitalize">{type.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: Timeline Canvas */}
      <div className="flex-1 rounded-xl border border-hs-border bg-hs-surface/50 p-6 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-heading-sm font-semibold text-hs-ink">{program.title}</h2>
            <p className="text-body-sm text-hs-text-secondary">Linear Timeline View</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleTestEnroll}
              disabled={enrolling}
              className="flex items-center gap-2 rounded-lg border border-hs-border bg-hs-paper px-3 py-1.5 text-body-sm font-medium text-hs-ink hover:bg-hs-surface"
            >
              Test Enroll
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-hs-primary px-3 py-1.5 text-body-sm font-medium text-white hover:bg-hs-primary-light">
              <Plus className="h-4 w-4" /> Add Step
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.id} className="rounded-lg border border-hs-border bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-semibold text-hs-ink">Day {step.day_offset}: {step.title}</h4>
                <button className="text-hs-text-tertiary hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>

              <div className="min-h-[60px] rounded-md border-2 border-dashed border-hs-border/50 bg-hs-surface/30 p-2">
                {step.blocks.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-caption-sm text-hs-text-tertiary">
                    Drop blocks here
                  </div>
                ) : (
                  <div className="space-y-2">
                    {step.blocks.map((block) => (
                      <div 
                        key={block.id}
                        onClick={() => setSelectedBlockId(block.id || null)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded border p-2 text-body-sm shadow-sm transition",
                          selectedBlockId === block.id ? "border-hs-primary bg-hs-primary/5" : "border-hs-border bg-white hover:border-hs-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-hs-text-tertiary" />
                          {BLOCK_ICONS[block.block_type] || <FileText className="h-4 w-4" />}
                          <span className="capitalize">{block.block_type.replace("_", " ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {steps.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-hs-border/50 bg-hs-surface">
              <p className="text-body-sm text-hs-text-tertiary">No steps added yet. Add a step to begin your timeline.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Block Inspector */}
      <div className="w-80 shrink-0 rounded-xl border border-hs-border bg-hs-surface p-4 flex flex-col overflow-y-auto">
        <div className="mb-4 flex items-center gap-2 border-b border-hs-border pb-4">
          <Settings2 className="h-5 w-5 text-hs-text-secondary" />
          <h3 className="text-body-md font-semibold text-hs-ink">Inspector</h3>
        </div>

        {selectedBlockId ? (
          <div className="space-y-4">
            <p className="text-caption-sm text-hs-text-secondary">Editing block configurations will update the JSON schema automatically.</p>
            
            <div className="space-y-2">
              <label className="text-caption-sm font-medium text-hs-text-secondary">Block Type</label>
              <input disabled value="mcq_form" className="w-full rounded border border-hs-border bg-hs-surface/50 px-2 py-1.5 text-body-sm text-hs-text-tertiary" />
            </div>

            <div className="space-y-2">
              <label className="text-caption-sm font-medium text-hs-text-secondary">JSON Config</label>
              <textarea 
                className="h-48 w-full resize-y rounded border border-hs-border bg-hs-paper p-2 text-xs font-mono text-hs-ink"
                defaultValue={JSON.stringify({ question: "How are you feeling?", options: ["Good", "Bad"] }, null, 2)}
              />
            </div>
            
            <button className="w-full rounded bg-hs-primary py-2 text-body-sm font-medium text-white hover:bg-hs-primary-light">
              Save Config
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-body-sm text-hs-text-tertiary">Select a block in the timeline to inspect its properties.</p>
          </div>
        )}
      </div>

    </div>
  );
}
