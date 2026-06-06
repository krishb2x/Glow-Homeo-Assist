import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/email";

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
          
        // Fetch patient to send email
        if (paymentRecord.patient_id) {
          const { data: patient } = await supabase
            .from("mt_patients")
            .select("name, email")
            .eq("id", paymentRecord.patient_id)
            .single();

          if (patient?.email) {
            await sendConfirmationEmail(
              patient.email,
              "Consultation Booking Confirmed - MediTonic",
              `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <h2 style="color: #1B6B5C;">Booking Confirmed!</h2>
                  <p>Dear ${patient.name},</p>
                  <p>Thank you for booking a consultation with Dr. Aman Agarwal.</p>
                  <p>We have successfully received your payment.</p>
                  <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #166534;"><strong>Next Steps:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #166534;">Dr. Aman will contact you on your registered WhatsApp number shortly to schedule the exact time of your consultation.</p>
                  </div>
                  <br/>
                  <p style="color: #4b5563; font-size: 14px;">Warm regards,<br/><strong>The MediTonic Team</strong></p>
                </div>
              `
            );
          }
        }
        
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
          
        // Fetch patient to send email
        if (paymentRecord.patient_id) {
          const { data: patient } = await supabase
            .from("mt_patients")
            .select("name, email")
            .eq("id", paymentRecord.patient_id)
            .single();

          if (patient?.email) {
            await sendConfirmationEmail(
              patient.email,
              "eBook Order Confirmed - MediTonic",
              `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <h2 style="color: #1B6B5C;">Order Confirmed!</h2>
                  <p>Dear ${patient.name},</p>
                  <p>Thank you for your eBook purchase from MediTonic.</p>
                  <p>We have successfully received your payment.</p>
                  <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #166534;"><strong>Next Steps:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #166534;">You will receive your eBook download link or a direct copy shortly.</p>
                  </div>
                  <br/>
                  <p style="color: #4b5563; font-size: 14px;">Warm regards,<br/><strong>The MediTonic Team</strong></p>
                </div>
              `
            );
          }
        }
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
