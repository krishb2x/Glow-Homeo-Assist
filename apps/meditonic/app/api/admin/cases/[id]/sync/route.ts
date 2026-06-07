import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const caseId = resolvedParams.id;
    const supabase = createAdminClient();

    // 1. Fetch the case to ensure it exists
    const { data: caseData, error: fetchError } = await supabase
      .from("mt_cases")
      .select("id, sync_status")
      .eq("id", caseId)
      .single();

    if (fetchError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (caseData.sync_status === "synced") {
      return NextResponse.json({ message: "Already synced" });
    }

    // 2. Simulate pushing to GlowHomeo API
    // In a real scenario, this would call fetch('https://api.glowhomeo.com/cases', { ... })
    // For now, we simulate a successful integration by generating a dummy ID
    const dummyGlowHomeoId = `GH-${Date.now().toString().slice(-6)}`;

    // 3. Update the case with synced status and the generated ID
    const { error: updateError } = await supabase
      .from("mt_cases")
      .update({ 
        sync_status: "synced",
        glowhomeo_id: dummyGlowHomeoId,
        updated_at: new Date().toISOString()
      })
      .eq("id", caseId);

    if (updateError) {
      console.error("GlowHomeo Sync update error:", updateError);
      return NextResponse.json({ error: "Failed to update case status" }, { status: 500 });
    }

    // 4. Log activity
    await supabase.from("mt_case_activities").insert({
      case_id: caseId,
      action: "System Sync",
      details: { message: `Case successfully synced to GlowHomeo. Remote ID: ${dummyGlowHomeoId}` }
    });

    return NextResponse.json({ success: true, glowhomeo_id: dummyGlowHomeoId });
  } catch (error: any) {
    console.error("GlowHomeo Sync API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
