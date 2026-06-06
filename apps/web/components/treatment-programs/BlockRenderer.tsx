import type { TpBlock } from "../../lib/tp-api";

type BlockRendererProps = {
  block: TpBlock;
  isDone: boolean;
  onComplete?: (data: Record<string, unknown>) => void;
};

export function BlockRenderer({ block, isDone, onComplete }: BlockRendererProps) {
  const config = block.config || {};

  switch (block.block_type) {
    case "rich_text":
      return (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none text-hs-ink" dangerouslySetInnerHTML={{ __html: String(config.html || "<p>Content goes here.</p>") }} />
          {!isDone && (
            <button 
              onClick={() => onComplete?.({ read: true })}
              className="mt-4 rounded bg-hs-primary px-4 py-2 text-body-sm font-medium text-white hover:bg-hs-primary-light"
            >
              Mark as Read
            </button>
          )}
        </div>
      );
      
    case "youtube_video":
      return (
        <div className="space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-hs-border bg-hs-surface">
            {config.url ? (
              <iframe 
                src={String(config.url).replace("watch?v=", "embed/")} 
                className="h-full w-full border-0"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full items-center justify-center text-hs-text-tertiary">No video URL configured</div>
            )}
          </div>
          {!isDone && (
            <button 
              onClick={() => onComplete?.({ watched: true })}
              className="mt-4 rounded bg-hs-primary px-4 py-2 text-body-sm font-medium text-white hover:bg-hs-primary-light"
            >
              I have watched this video
            </button>
          )}
        </div>
      );

    case "weight_tracker":
      return (
        <div className="space-y-4 rounded-xl border border-hs-border bg-hs-surface/50 p-6">
          <label className="block text-body-sm font-medium text-hs-text-secondary">Enter your weight today ({String(config.unit || "kg")})</label>
          <input 
            type="number" 
            placeholder="e.g. 70" 
            disabled={isDone}
            className="w-full max-w-xs rounded border border-hs-border bg-white px-3 py-2 text-body-md text-hs-ink"
            id={`weight-${block.id}`}
          />
          {!isDone && (
            <button 
              onClick={() => {
                const val = (document.getElementById(`weight-${block.id}`) as HTMLInputElement)?.value;
                if (val) onComplete?.({ weight: Number(val) });
              }}
              className="block rounded bg-hs-primary px-4 py-2 text-body-sm font-medium text-white hover:bg-hs-primary-light"
            >
              Log Weight
            </button>
          )}
        </div>
      );

    case "mcq_form":
      return (
        <div className="space-y-4 rounded-xl border border-hs-border bg-hs-surface/50 p-6">
          <p className="text-body-md font-medium text-hs-ink">{String(config.question || "How are you feeling?")}</p>
          <div className="space-y-2">
            {(Array.isArray(config.options) ? config.options : ["Good", "Bad"]).map((opt, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3 rounded-lg border border-hs-border bg-white p-3 hover:bg-hs-primary/5">
                <input type="radio" name={`mcq-${block.id}`} value={String(opt)} disabled={isDone} />
                <span className="text-body-sm text-hs-ink">{String(opt)}</span>
              </label>
            ))}
          </div>
          {!isDone && (
            <button 
              onClick={() => {
                const selected = document.querySelector(`input[name="mcq-${block.id}"]:checked`) as HTMLInputElement;
                if (selected) onComplete?.({ answer: selected.value });
              }}
              className="mt-4 rounded bg-hs-primary px-4 py-2 text-body-sm font-medium text-white hover:bg-hs-primary-light"
            >
              Submit Answer
            </button>
          )}
        </div>
      );

    default:
      return (
        <div className="rounded border border-dashed border-hs-border p-4 text-center text-caption-sm text-hs-text-tertiary">
          Renderer not implemented for: {block.block_type}
        </div>
      );
  }
}
