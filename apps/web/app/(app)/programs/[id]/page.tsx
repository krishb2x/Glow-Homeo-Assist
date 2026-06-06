"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProgramBlueprint, type TpProgram } from "../../../../lib/tp-api";
import { PageLoad, PageError } from "../../../../components/ui/page-states";
import { ProgramBuilder } from "../../../../components/treatment-programs/ProgramBuilder";

export default function ProgramBuilderPage() {
  const { id } = useParams() as { id: string };
  const [program, setProgram] = useState<TpProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { program: data } = await getProgramBlueprint(id);
        setProgram(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load program"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (loading) return <PageLoad />;
  if (error || !program) return <PageError err={error || new Error("Program not found")} />;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <ProgramBuilder initialProgram={program} />
    </div>
  );
}
