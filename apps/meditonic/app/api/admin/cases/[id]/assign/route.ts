import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { doctorId } = await req.json();
    const p = await params;

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Update the case
    const { error } = await supabase
      .from("cases")
      .update({ 
        doctor_id: doctorId,
        status: "assigned",
        updated_at: new Date().toISOString()
      })
      .eq("id", p.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error assigning doctor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
