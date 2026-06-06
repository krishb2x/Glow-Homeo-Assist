"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Workflow } from "lucide-react";
import { PageHeader } from "../../../components/platform/PageHeader";
import { createProgram } from "../../../lib/tp-api";
import { useRouter } from "next/navigation";
import { useAppRole } from "../../../contexts/RoleContext";

export default function ProgramsDashboard() {
  const router = useRouter();
  const { activeClinicId } = useAppRole();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!activeClinicId) return;
    setCreating(true);
    try {
      const { program } = await createProgram({
        title: "New Treatment Program",
        description: "A dynamic patient journey.",
        status: "draft"
      });
      router.push(`/programs/${program.id}`);
    } catch (err) {
      console.error("Failed to create program", err);
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Treatment Programs ⭐" />
        <button 
          onClick={handleCreate} 
          disabled={creating || !activeClinicId}
          className="flex items-center gap-2 rounded-lg bg-hs-primary px-4 py-2 text-white font-medium hover:bg-hs-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Program
        </button>
      </div>

      <div className="rounded-xl border border-hs-border bg-hs-surface p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-hs-primary/10">
          <Workflow className="h-8 w-8 text-hs-primary" />
        </div>
        <h2 className="mt-4 text-heading-md font-semibold text-hs-ink">No programs yet</h2>
        <p className="mt-2 text-body-md text-hs-text-secondary">
          Treatment programs power dynamic patient journeys with automated assessments, content, and tracking.
        </p>
      </div>
    </div>
  );
}
