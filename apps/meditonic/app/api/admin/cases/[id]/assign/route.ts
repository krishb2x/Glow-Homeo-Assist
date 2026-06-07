import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const caseId = resolvedParams.id;
    const { doctorId } = await req.json();

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Update the case assignment
    const { data: updatedCase, error: updateError } = await supabase
      .from("mt_cases")
      .update({ 
        assigned_doctor_id: doctorId,
        status: "assigned",
        updated_at: new Date().toISOString()
      })
      .eq("id", caseId)
      .select("id")
      .single();

    if (updateError || !updatedCase) {
      console.error("Assignment error:", updateError);
      return NextResponse.json({ error: "Failed to assign doctor" }, { status: 500 });
    }

    // 2. Log activity
    await supabase.from("mt_case_activities").insert({
      case_id: caseId,
      action: "Doctor Assigned",
      details: { doctorId, message: "Doctor assigned to case via Admin UI" }
    });

    return NextResponse.json({ success: true, caseId });
  } catch (error: any) {
    console.error("Doctor assignment API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
