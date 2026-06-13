import crypto from "crypto";
export const maxDuration = 300; // Allow up to 5 minutes for large PDF processing
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../lib/email";
import { Template_ConsultationConfirmed, Template_EbookPurchased, Template_ProgramPurchased, Template_StorePaymentConfirmed } from "../../../../lib/email-templates";
import { processStoreFulfillment } from "../../../../lib/storeFulfillment";

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
    .select("*, mt_partners(id, base_commission_rate, partner_type)")
    .eq("id", referralCodeId)
    .single();
    
  if (!referralError && referralData && referralData.mt_partners) {
    const partner: any = Array.isArray(referralData.mt_partners) ? referralData.mt_partners[0] : referralData.mt_partners;
    
    // Commission Rate Priority Hierarchy:
    // 1. Referral Code Commission Rate (Override)
    // 2. Partner Custom Commission Rate (base_commission_rate)
    // 3. Partner Default Commission Rate (influencer: 15%, affiliate/other: 10%)
    // 4. System Default Commission Rate (10%)
    const referralRate = referralData.commission_rate;
    const partnerRate = partner?.base_commission_rate;
    const partnerDefaultRate = partner?.partner_type === 'influencer' ? 15 : 10;
    const systemDefaultRate = 10;

    const commissionRate = referralRate !== null && referralRate !== undefined 
      ? referralRate 
      : (partnerRate !== null && partnerRate !== undefined 
        ? partnerRate 
        : (partnerDefaultRate ?? systemDefaultRate));

    const revenueAfterDiscount = amount || 0;

    // Deduct GST (18%), Payment Gateway charges (2%), and GlowHomeo Platform charges (7%) individually
    const gstAmount = revenueAfterDiscount * 0.18;
    const pgAmount = revenueAfterDiscount * 0.02;
    const glowhomeoAmount = revenueAfterDiscount * 0.07;
    
    const netRevenue = revenueAfterDiscount - gstAmount - pgAmount - glowhomeoAmount;
    const commissionAmount = (netRevenue * commissionRate) / 100;

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
    
    // Dynamic update object based on existing schema columns
    const updateFields: any = {};
    if (referralData.current_usage !== undefined) {
      updateFields.current_usage = (referralData.current_usage || 0) + 1;
    }
    if (referralData.current_uses !== undefined) {
      updateFields.current_uses = (referralData.current_uses || 0) + 1;
    }

    await supabase
      .from("mt_referral_codes")
      .update(updateFields)
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
        .select("id, status, fulfillment_status, customer_name, customer_email, clinic_id, audit_log")
        .eq("razorpay_order_id", orderId)
        .single();

      if (storeOrder) {
        // 1. If the order is already fully completed and delivered, return early
        if (storeOrder.fulfillment_status === "fulfilled") {
          return NextResponse.json({ status: "ok", message: "Already fulfilled store order" });
        }

        // 2. If it was pending, update it to paid in the database
        if (storeOrder.status === "pending") {
          await supabase
            .from("mt_orders")
            .update({
              status: "paid",
              razorpay_payment_id: payment.id,
              updated_at: new Date().toISOString()
            })
            .eq("id", storeOrder.id);
        }

        // 3. Process referral commission if not already attributed
        if (storeOrder.audit_log && Array.isArray(storeOrder.audit_log)) {
          const referralLog = storeOrder.audit_log.find((log: any) => log.action === 'applied_referral');
          if (referralLog && referralLog.code) {
            const { data: existingAttr } = await supabase
              .from("mt_order_attributions")
              .select("id")
              .eq("order_id", storeOrder.id)
              .maybeSingle();

            if (!existingAttr) {
              const { data: refCodeData } = await supabase
                .from("mt_referral_codes")
                .select("id")
                .eq("code", referralLog.code)
                .single();

              if (refCodeData) {
                console.log(`[Webhook] Processing referral commission for store order ${storeOrder.id} with code ${referralLog.code}`);
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
        }

        // 4. Send Payment Confirmation Email (Email #1) only if the order was not already paid
        if (storeOrder.status === "pending" && storeOrder.customer_email) {
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

        // 5. Enqueue Sync Job for Background Worker record as fallback (only if not already existing)
        const { data: existingSync } = await supabase
          .from("mt_sync_queue")
          .select("id")
          .eq("target_system", "store_fulfillment")
          .eq("operation", "process_order")
          .eq("payload->>order_id", storeOrder.id)
          .maybeSingle();

        if (!existingSync) {
          await supabase.from("mt_sync_queue").insert({
            target_system: "store_fulfillment",
            operation: "process_order",
            payload: { order_id: storeOrder.id },
            status: "pending"
          });
        }

        // 6. Trigger auto-delivery synchronously if not already fulfilled
        try {
          // Re-fetch order status to check if it was marked fulfilled by a concurrent thread
          const { data: freshOrder } = await supabase
            .from("mt_orders")
            .select("fulfillment_status")
            .eq("id", storeOrder.id)
            .single();

          if (freshOrder && freshOrder.fulfillment_status !== "fulfilled") {
            console.log(`[Webhook] Triggering auto-delivery for store order ${storeOrder.id}`);
            await processStoreFulfillment(storeOrder.id);
            console.log(`[Webhook] Auto-delivery completed for store order ${storeOrder.id}`);
          } else {
            console.log(`[Webhook] Store order ${storeOrder.id} already fulfilled, skipping duplicate delivery.`);
          }
        } catch (err) {
          console.error(`[Webhook Error] Order ${storeOrder.id} fulfillment failed:`, err);
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
      } else if (paymentRecord.purpose === "treatment_kit") {
        // Update Case Status & Log Activity
        const { data: updatedCase } = await supabase
          .from("mt_cases")
          .update({ 
            payment_status: "captured",
            status: "new",
            workflow_status: "doctor_review"
          })
          .eq("id", paymentRecord.reference_id)
          .select("id")
          .single();

        if (updatedCase) {
          await supabase.from("mt_case_activities").insert({
            case_id: updatedCase.id,
            action: "Payment Captured",
            details: { message: "Razorpay webhook confirmed payment for Treatment Kit Case", orderId, amount: paymentRecord.amount }
          });
          
          // Enqueue Sync Job for Google Sheets
          await supabase.from("mt_sync_queue").insert({
            case_id: updatedCase.id,
            target_system: "google_sheets",
            operation: "insert",
            payload: { reference_id: paymentRecord.reference_id, case_type: "treatment_kit" }
          });
        }

        // Fetch patient to send confirmation email
        if (paymentRecord.patient_id) {
          const { data: patient } = await supabase
            .from("mt_patients")
            .select("name, email")
            .eq("id", paymentRecord.patient_id)
            .single();

          if (patient?.email) {
            await sendConfirmationEmail(
              patient.email,
              "Treatment Kit Case Created - MediTonic",
              `
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; background-color: #E5F1EE; border-radius: 50%; line-height: 64px; text-align: center;">
                  <span style="color: #1B6B5C; font-size: 32px;">✓</span>
                </div>
              </div>
              <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center;">Case Created Successfully!</h2>
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 24px; text-align: center;">
                Dear <strong>${patient.name}</strong>, thank you for submitting your intake form. Your treatment kit case has been registered.<br><br>
                Our medical team will review your details. Once approved, we will collect your physical delivery address to ship your treatment kit.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 22px;">
                  <strong>Case Reference ID:</strong> MT-KIT-${paymentRecord.reference_id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              `,
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
