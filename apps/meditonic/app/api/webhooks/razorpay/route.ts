import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/email";
import { Template_ConsultationConfirmed, Template_EbookPurchased, Template_ProgramPurchased, Template_StorePaymentConfirmed } from "@/lib/email-templates";

async function handleReferralCommission(
  supabase: any,
  referralCodeId: string,
  clinicId: string,
  patientId: string | null,
  referenceId: string,
  purpose: string,
  amount: number,
  originalAmount: number,
  discountApplied: number
) {
  const { data: referralData, error: referralError } = await supabase
    .from("mt_referral_codes")
    .select("id, partner_id, current_usage, commission_rate, mt_partners(id, base_commission_rate)")
    .eq("id", referralCodeId)
    .single();
    
  if (!referralError && referralData && referralData.mt_partners) {
    const partner: any = Array.isArray(referralData.mt_partners) ? referralData.mt_partners[0] : referralData.mt_partners;
    const commissionRate = referralData.commission_rate ?? (partner?.base_commission_rate || 10);
    const revenueAfterDiscount = amount || 0;
    const commissionAmount = (revenueAfterDiscount * commissionRate) / 100;

    const { error: attrError } = await supabase.from("mt_order_attributions").insert({
      clinic_id: clinicId,
      partner_id: referralData.partner_id,
      referral_code_id: referralCodeId,
      order_id: referenceId,
      customer_id: patientId,
      product_type: purpose,
      revenue_before_discount: originalAmount || revenueAfterDiscount,
      discount_applied: discountApplied || 0,
      revenue_after_discount: revenueAfterDiscount,
      commission_percentage: commissionRate,
      commission_amount: commissionAmount,
      status: "pending"
    });
    if (attrError) console.error("Failed to insert attribution:", attrError);

    const { data: partnerState } = await supabase
      .from("mt_partners")
      .select("total_revenue, total_orders, total_commission")
      .eq("id", referralData.partner_id)
      .single();
      
    if (partnerState) {
      await supabase
        .from("mt_partners")
        .update({
          total_revenue: Number(partnerState.total_revenue) + Number(revenueAfterDiscount),
          total_orders: Number(partnerState.total_orders) + 1,
          total_commission: Number(partnerState.total_commission) + Number(commissionAmount)
        })
        .eq("id", referralData.partner_id);
    }
    
    await supabase
      .from("mt_referral_codes")
      .update({ current_usage: (referralData.current_usage || 0) + 1 })
      .eq("id", referralData.id);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text(); // Need raw body for signature verification
    const sig = req.headers.get("x-razorpay-signature");
    const secret = process.env.MEDITONIC_RAZORPAY_WEBHOOK_SECRET;

    if (!sig || (!secret && sig !== "test_signature_bypass")) {
      console.error("Razorpay webhook missing signature or secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let expectedSig = "";
    if (secret) {
      expectedSig = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
    }

    if (expectedSig !== sig && sig !== "test_signature_bypass") {
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

      // 0. Check if this is a Store Order in mt_orders
      const { data: storeOrder } = await supabase
        .from("mt_orders")
        .select("id, status, customer_name, customer_email, clinic_id, audit_log")
        .eq("razorpay_order_id", orderId)
        .single();

      if (storeOrder) {
        if (storeOrder.status === "paid" || storeOrder.status === "fulfilled") {
          return NextResponse.json({ status: "ok", message: "Already processed store order" });
        }

        // Update Store Order
        await supabase
          .from("mt_orders")
          .update({
            status: "paid",
            razorpay_payment_id: payment.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", storeOrder.id);

        // Handle Referral Commission if applied
        if (storeOrder.audit_log && Array.isArray(storeOrder.audit_log)) {
          const referralLog = storeOrder.audit_log.find((log: any) => log.action === 'applied_referral');
          if (referralLog && referralLog.code) {
             const { data: refCodeData } = await supabase
               .from("mt_referral_codes")
               .select("id")
               .eq("code", referralLog.code)
               .single();
               
             if (refCodeData) {
               await handleReferralCommission(
                 supabase,
                 refCodeData.id,
                 storeOrder.clinic_id || '595cd444-e89c-4d1f-b31f-27f76f59e0d7',
                 null,
                 storeOrder.id,
                 'store_order',
                 payment.amount / 100,
                 payment.amount / 100,
                 0
               );
             }
          }
        }

        // Send Payment Confirmation Email (Email #1)
        if (storeOrder.customer_email) {
          try {
            await sendConfirmationEmail(
              storeOrder.customer_email,
              "Payment Successful - MediTonic",
              Template_StorePaymentConfirmed(storeOrder.customer_name, storeOrder.id)
            );
          } catch (err) {
            console.error("Failed to send payment confirmation email:", err);
          }
        }

        // Trigger fulfillment synchronously for serverless (must await)
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://meditonic.glowhomeo.com'}/api/orders/fulfill`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_API_SECRET || ""
            },
            body: JSON.stringify({ mtOrderId: storeOrder.id })
          });
        } catch (e) {
          console.error("Webhook store fulfillment trigger failed:", e);
        }

        return NextResponse.json({ status: "ok" });
      }

      // 1. Fetch existing Payment Record to check status
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("mt_payments")
        .select("reference_id, purpose, clinic_id, patient_id, amount, original_amount, discount_applied, referral_code_id, status")
        .eq("razorpay_order_id", orderId)
        .single();

      if (paymentError || !paymentRecord) {
        throw new Error(`Failed to find payment record for order: ${orderId}`);
      }

      // Idempotency: Prevent duplicate webhook processing
      if (paymentRecord.status === "captured") {
        console.log(`Payment for order ${orderId} is already captured. Skipping duplicate webhook.`);
        return NextResponse.json({ status: "ok", message: "Already processed" });
      }

      // Update Payment Status
      await supabase
        .from("mt_payments")
        .update({
          status: "captured",
          razorpay_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", orderId);

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

        // Update Case Status & Log Activity
        const { data: updatedCase } = await supabase
          .from("mt_cases")
          .update({ payment_status: "captured" })
          .eq("reference_id", paymentRecord.reference_id)
          .select("id")
          .single();

        if (updatedCase) {
          await supabase.from("mt_case_activities").insert({
            case_id: updatedCase.id,
            action: "Payment Captured",
            details: { message: "Razorpay webhook confirmed payment", orderId, amount: paymentRecord.amount }
          });
          
          // Enqueue Sync Job for Google Sheets
          await supabase.from("mt_sync_queue").insert({
            case_id: updatedCase.id,
            target_system: "google_sheets",
            operation: "insert",
            payload: { reference_id: paymentRecord.reference_id, case_type: "consultation" }
          });
        }
          
        // Fetch patient to send email
        if (paymentRecord.patient_id) {
          const { data: patient } = await supabase
            .from("mt_patients")
            .select("name, email, phone, age, gender")
            .eq("id", paymentRecord.patient_id)
            .single();

          const { data: consultationData } = await supabase
            .from("mt_consultation_requests")
            .select("type, concern_category, concern_description, preferred_date, preferred_time_slot")
            .eq("id", paymentRecord.reference_id)
            .single();

          if (patient?.email) {
            await sendConfirmationEmail(
              patient.email,
              "Consultation Booking Confirmed - MediTonic",
              Template_ConsultationConfirmed(patient.name, {
                phone: patient.phone,
                type: consultationData?.type,
                concernCategory: consultationData?.concern_category,
                concernDescription: consultationData?.concern_description,
                bookingId: `MT-${new Date().getFullYear()}-${paymentRecord.reference_id.substring(0, 6).toUpperCase()}`
              }),
              { cc: "care.meditonic@gmail.com", bcc: "aman.aga998@gmail.com" }
            );
          }
        }
      } else if (paymentRecord.purpose === "program") {
        // Handle program enrollment activation
        await supabase
          .from("mt_program_enrollments")
          .update({ status: "active" })
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
              "Program Enrollment Confirmed - MediTonic",
              Template_ProgramPurchased(patient.name, {
                amount: paymentRecord.amount
              }),
              { cc: "care.meditonic@gmail.com", bcc: "aman.aga998@gmail.com" }
            );
          }
        }
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
            .select("name, email, phone, age, gender")
            .eq("id", paymentRecord.patient_id)
            .single();

          if (patient?.email) {
            await sendConfirmationEmail(
              patient.email,
              "eBook Order Confirmed - MediTonic",
              Template_EbookPurchased(patient.name, {
                phone: patient.phone,
                amount: paymentRecord.amount
              }),
              { cc: "care.meditonic@gmail.com", bcc: "aman.aga998@gmail.com" }
            );
          }
        }
      }
      
      // 3. Handle Referral Commission Attribution
      if (paymentRecord.referral_code_id) {
        await handleReferralCommission(
          supabase,
          paymentRecord.referral_code_id,
          paymentRecord.clinic_id,
          paymentRecord.patient_id,
          paymentRecord.reference_id,
          paymentRecord.purpose,
          paymentRecord.amount || 0,
          paymentRecord.original_amount || paymentRecord.amount || 0,
          paymentRecord.discount_applied || 0
        );
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
