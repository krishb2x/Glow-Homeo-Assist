import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { processStoreFulfillment } from "@/lib/storeFulfillment";

export const maxDuration = 300; // Allow 5 minutes for heavy PDF operations
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Optional security: Ensure request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    console.warn("Unauthorized sync-worker attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  console.log("[Sync Worker] Waking up to process queue...");

  try {
    // 1. Claim Jobs: Fetch up to 5 pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from("mt_sync_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (fetchError) {
      throw new Error(`Failed to fetch sync queue: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No pending jobs." });
    }

    console.log(`[Sync Worker] Found ${jobs.length} pending jobs.`);

    // 2. Process Jobs
    let successCount = 0;
    let failCount = 0;

    for (const job of jobs) {
      try {
        // Mark as processing to prevent duplicate execution if worker overlaps
        await supabase
          .from("mt_sync_queue")
          .update({ status: "processing" })
          .eq("id", job.id);

        // Execute specific operation based on target_system
        if (job.target_system === "store_fulfillment") {
          const orderId = job.payload?.order_id;
          if (!orderId) throw new Error("Missing order_id in payload");
          
          await processStoreFulfillment(orderId);
          
        } else {
          // Unsupported job
          throw new Error(`Unsupported target_system: ${job.target_system}`);
        }

        // Job succeeded
        await supabase
          .from("mt_sync_queue")
          .update({ 
            status: "completed", 
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
          
        successCount++;
        console.log(`[Sync Worker] Job ${job.id} completed successfully.`);

      } catch (err: any) {
        console.error(`[Sync Worker] Job ${job.id} failed:`, err);
        
        // Job failed
        await supabase
          .from("mt_sync_queue")
          .update({ 
            status: "failed", 
            error_message: err.message || "Unknown error occurred",
            attempts: (job.attempts || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
          
        failCount++;
      }
    }

    return NextResponse.json({
      message: `Processed ${jobs.length} jobs`,
      success: successCount,
      failed: failCount
    });

  } catch (globalError: any) {
    console.error("[Sync Worker] Global failure:", globalError);
    return NextResponse.json({ error: globalError.message }, { status: 500 });
  }
}
