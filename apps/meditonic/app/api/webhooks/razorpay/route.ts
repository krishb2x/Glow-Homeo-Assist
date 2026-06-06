import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.text(); // Need raw body for signature verification
    const sig = req.headers.get("x-razorpay-signature");
    const secret = process.env.MEDITONIC_RAZORPAY_WEBHOOK_SECRET;

    if (!sig || !secret) {
      console.error("Razorpay webhook missing signature or secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSig !== sig) {
      console.error("Invalid Razorpay signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;
    
    // Check if payment captured successfully
    if (event === "payment.captured" || event === "payment.authorized") {
      const supabase = createAdminClient();

      // 1. Update Payment Status
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("mt_payments")
        .update({
          status: "captured",
          razorpay_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", orderId)
        .select("reference_id, purpose, clinic_id, patient_id")
        .single();

      if (paymentError || !paymentRecord) {
        throw new Error(`Failed to update payment record for order: ${orderId}`);
      }

      // 2. Handle specific purchase flows based on purpose
      if (paymentRecord.purpose === "consultation") {
        // Update consultation status to confirmed
        await supabase
          .from("mt_consultation_requests")
          .update({ 
            status: "confirmed",
            updated_at: new Date().toISOString()
          })
          .eq("id", paymentRecord.reference_id);
          
        // Note: Phase 3 enhancement - Send Confirmation Email via Resend here
        
      } else if (paymentRecord.purpose === "program") {
        // Handle program enrollment activation
        await supabase
          .from("mt_program_enrollments")
          .update({ status: "active" })
          .eq("id", paymentRecord.reference_id);
          
      } else if (paymentRecord.purpose === "ebook") {
        // Update eBook order status to require manual delivery
        await supabase
          .from("mt_ebook_orders")
          .update({ payment_status: "captured" })
          .eq("id", paymentRecord.reference_id);
          
        // Note: Doctor needs to be notified here for manual delivery
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Razorpay Webhook Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
