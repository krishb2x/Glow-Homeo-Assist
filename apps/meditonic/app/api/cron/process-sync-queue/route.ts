import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { appendCaseToSheet } from "@/lib/google-sheets";

export async function POST(req: Request) {
  // In production, you would want a secret token here to prevent abuse
  // const authHeader = req.headers.get("authorization");
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const supabase = createAdminClient();

    // 1. Fetch pending sync queue jobs for google_sheets
    const { data: jobs, error: fetchError } = await supabase
      .from("mt_sync_queue")
      .select("*")
      .eq("target_system", "google_sheets")
      .eq("status", "pending")
      .limit(10); // Process in small batches

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No pending jobs" });
    }

    const results = [];

    // 2. Process each job
    for (const job of jobs) {
      try {
        // Mark as processing
        await supabase.from("mt_sync_queue").update({ status: "processing" }).eq("id", job.id);

        if (job.operation === "insert") {
          // Fetch the full case details to send to sheets
          const caseId = job.case_id;
          const { data: caseData } = await supabase
            .from("mt_cases")
            .select(`
              *,
              profiles:assigned_doctor_id (full_name)
            `)
            .eq("id", caseId)
            .single();

          if (caseData) {
            await appendCaseToSheet({
              caseId: caseData.id.split('-')[0].toUpperCase(), // Short ID
              date: new Date(caseData.created_at).toISOString().split('T')[0],
              patientName: caseData.patient_name,
              mobile: caseData.mobile,
              caseType: caseData.case_type,
              concern: caseData.concern_category || "N/A",
              assignedDoctor: caseData.profiles?.full_name || "Unassigned",
              status: caseData.status.replace('_', ' '),
              paymentStatus: caseData.payment_status
            });
          }
        }

        // Mark as completed
        await supabase.from("mt_sync_queue").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", job.id);
        results.push({ id: job.id, status: "success" });

      } catch (err: any) {
        console.error(`Failed to process job ${job.id}:`, err);
        
        // Mark as failed and increment retry
        await supabase.from("mt_sync_queue").update({ 
          status: job.retry_count >= 3 ? "failed" : "pending", 
          error_message: err.message || "Unknown error",
          retry_count: job.retry_count + 1,
          updated_at: new Date().toISOString()
        }).eq("id", job.id);
        
        results.push({ id: job.id, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({ processed: jobs.length, results });

  } catch (error: any) {
    console.error("Queue Processor Error:", error);
    return NextResponse.json({ error: "Queue processing failed" }, { status: 500 });
  }
}
