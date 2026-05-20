"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemePreference } from "../../ui/ThemeProvider";
import type { ThemePreference } from "../../../lib/theme-preference";
import { cn } from "../../../lib/cn";

const OPTIONS: Array<{ id: ThemePreference; label: string; icon: typeof Sun; hint: string }> = [
  { id: "light", label: "Light", icon: Sun, hint: "Bright clinic desk" },
  { id: "dark", label: "Dark", icon: Moon, hint: "Low-light examination rooms" },
  { id: "system", label: "System", icon: Monitor, hint: "Match device setting" }
];

export function ThemeSettingsSection(): JSX.Element {
  const { preference, setPreference } = useThemePreference();

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-hs-text-secondary">
        Applies to the doctor workspace. Marketing pages stay light.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ id, label, icon: Icon, hint }) => {
          const selected = preference === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPreference(id)}
              className={cn(
                "flex flex-col items-start rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/30",
                selected
                  ? "border-hs-primary/45 bg-hs-primary-very-light/60 ring-1 ring-hs-primary/15"
                  : "border-hs-border/40 bg-hs-paper hover:border-hs-primary/25"
              )}
              aria-pressed={selected}
            >
              <Icon className={cn("h-5 w-5", selected ? "text-hs-primary" : "text-hs-text-tertiary")} aria-hidden />
              <span className="mt-2 text-body-sm font-semibold text-hs-ink">{label}</span>
              <span className="mt-0.5 text-caption-sm text-hs-text-tertiary">{hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
