import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch consultation
    const { data: consultation, error: consultationError } = await supabase
      .from("mt_consultation_requests")
      .select("*, mt_patients(name, phone)")
      .eq("id", id)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId: `MT-${new Date(consultation.created_at).getFullYear()}-${consultation.id.substring(0, 6).toUpperCase()}`,
        patientName: consultation.mt_patients?.name || "Unknown",
        phone: consultation.mt_patients?.phone || "Not provided",
        type: consultation.type,
        concernCategory: consultation.concern_category,
      }
    });

  } catch (error: any) {
    console.error("Error fetching details:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
