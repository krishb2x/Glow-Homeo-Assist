import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "../../../lib/supabase";
import { bookingFormSchema } from "../../../lib/validations";
import { BRAND } from "../../../lib/constants";
import { isReferralApplicable, findReferralOverride } from "../../../lib/referrals/product-mapping";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID || process.env.MEDITONIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.MEDITONIC_RAZORPAY_KEY_SECRET || "",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Validate Input
    const parsedData = bookingFormSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: parsedData.error.errors },
        { status: 400 }
      );
    }

    const data = parsedData.data;
    const supabase = createAdminClient();
    const clinicId = BRAND.clinicId;

    // 2. Check for Razorpay Keys
    if (!process.env.MEDITONIC_RAZORPAY_KEY_SECRET) {
      console.warn("MEDITONIC_RAZORPAY_KEY_SECRET is not set. Payments will fail in production.");
    }

    // 3. Upsert Patient
    let patientId: string;
    
    // Try to find existing patient by phone and clinic
    const { data: existingPatient } = await supabase
      .from("mt_patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("phone", data.phone)
      .single();

    if (existingPatient) {
      patientId = existingPatient.id;
      // Optionally update name/email if provided
      await supabase
        .from("mt_patients")
        .update({ name: data.name, email: data.email, age: data.age, gender: data.gender })
        .eq("id", patientId);
    } else {
      // Create new patient
      const { data: newPatient, error: patientError } = await supabase
        .from("mt_patients")
        .insert({
          clinic_id: clinicId,
          name: data.name,
          email: data.email || null,
          phone: data.phone,
          age: data.age,
          gender: data.gender,
        })
        .select("id")
        .single();

      if (patientError) throw patientError;
      patientId = newPatient.id;
    }

    // 4. Determine Price from DB
    const { data: feeData, error: feeError } = await supabase
      .from("mt_consultation_fees")
      .select("id, price")
      .eq("clinic_id", clinicId)
      .eq("type", data.type)
      .single();

    if (feeError || !feeData) {
      console.error("Failed to fetch price for consultation type:", data.type);
      return NextResponse.json({ error: "Invalid consultation type or price not found" }, { status: 400 });
    }

    let originalPrice = feeData.price;
    let price = originalPrice;
    let discountApplied = 0;
    let referralCodeId = null;

    // 4.5. Process Referral Code if provided
    if (data.referralCode) {
      const { data: referralData, error: referralError } = await supabase
        .from("mt_referral_codes")
        .select(`
          *,
          mt_referral_products (
            product_type,
            product_id,
            discount_type,
            discount_value,
            commission_type,
            commission_value,
            is_active
          )
        `)
        .eq("clinic_id", clinicId)
        .ilike("code", data.referralCode)
        .single();

      if (!referralError && referralData && referralData.is_active) {
        const now = new Date();
        
        // Start date check
        const validFrom = referralData.valid_from ? new Date(referralData.valid_from) : null;
        const startValid = !validFrom || validFrom <= now;

        // Expiration check
        const validUntil = referralData.valid_until ? new Date(referralData.valid_until) : null;
        const endValid = !validUntil || validUntil >= now;

        // Usage limit check
        const maxUses = referralData.max_uses;
        const currentUses = referralData.current_uses || 0;
        const limitValid = maxUses === undefined || maxUses === null || currentUses < maxUses;
        
        // Scoping check using shared logic and overrides
        let override = findReferralOverride(referralData.mt_referral_products, feeData.id, "consultation");

        const isApplicable = !referralData.mt_referral_products || referralData.mt_referral_products.length === 0 || (override && override.is_active !== false);

        if (startValid && endValid && limitValid && isApplicable) {
          referralCodeId = referralData.id;
          
          let discountType = override?.discount_type || "percentage";
          let discountValue = override ? Number(override.discount_value) : 10;
          
          if (override && override.discount_type && override.discount_value !== undefined && override.discount_value !== null) {
            discountType = override.discount_type;
            discountValue = Number(override.discount_value);
          }
          
          if (discountType === 'percentage') {
            discountApplied = (originalPrice * discountValue) / 100;
          } else if (discountType === 'fixed') {
            discountApplied = discountValue;
          }
          
          price = Math.max(0, originalPrice - discountApplied);
        }
      }
    }

    // 5. Create Consultation Request (Pending)
    const { data: consultation, error: consultationError } = await supabase
      .from("mt_consultation_requests")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        type: data.type,
        concern_category: data.concernCategory,
        concern_description: data.concernDescription,
        preferred_date: data.preferredDate || null,
        preferred_time_slot: data.preferredTimeSlot || null,
        status: "pending_payment",
        price_charged: price,
        referral_code_id: referralCodeId,
        discount_applied: discountApplied
      })
      .select("id")
      .single();

    if (consultationError) throw consultationError;

    // 6. Create Razorpay Order
    // Ensure amount is an integer to prevent Razorpay BAD_REQUEST_ERROR
    const amountInPaise = Math.round(price * 100);
    
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${consultation.id.substring(0, 8)}`,
      notes: {
        consultation_id: consultation.id,
        patient_id: patientId,
        clinic_id: clinicId,
      },
    };

    let orderId = `mock_order_${Date.now()}`;
    const rzpSecret = process.env.MEDITONIC_RAZORPAY_KEY_SECRET;
    
    if (rzpSecret) {
      const order = await getRazorpay().orders.create(options);
      orderId = order.id;
    } else {
      console.warn("Razorpay keys missing. Mocking order creation for local testing.");
    }

    // 7. Create Payment Record (Pending)
    const { data: payment, error: paymentError } = await supabase
      .from("mt_payments")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        amount: price,
        original_amount: originalPrice,
        discount_applied: discountApplied,
        currency: "INR",
        razorpay_order_id: orderId,
        status: "created",
        purpose: "consultation",
        reference_id: consultation.id,
        referral_code_id: referralCodeId,
      })
      .select("id")
      .single();

    if (paymentError) throw paymentError;

    // 7.5. Create Case Record (Immediate Lead Capture)
    const { data: newCase, error: caseError } = await supabase
      .from("mt_cases")
      .insert({
        clinic_id: clinicId,
        case_type: "consultation",
        reference_id: consultation.id,
        patient_name: data.name,
        mobile: data.phone,
        email: data.email || null,
        age: data.age || null,
        gender: data.gender || null,
        concern_category: data.concernCategory,
        description: data.concernDescription,
        source: "website",
        referral_code_id: referralCodeId,
        payment_status: "pending",
        status: "new"
      })
      .select("id")
      .single();

    if (caseError) {
      console.error("Failed to create mt_cases record:", caseError);
      // We don't throw here to ensure the payment flow still continues
    } else {
      // Log Activity
      await supabase.from("mt_case_activities").insert({
        case_id: newCase.id,
        action: "Case Created",
        details: { message: "Consultation booked from website", consultationId: consultation.id }
      });
    }

    // DEV ONLY: Automatically trigger the webhook since Razorpay cannot reach localhost
    if (process.env.NODE_ENV === "development") {
      setTimeout(() => {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/webhooks/razorpay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-razorpay-signature": "test_signature_bypass"
          },
          body: JSON.stringify({
            event: "payment.captured",
            payload: {
              payment: {
                entity: {
                  id: `mock_pay_${Date.now()}`,
                  order_id: orderId,
                  amount: amountInPaise
                }
              }
            }
          })
        }).catch(err => console.error("Local webhook mock failed:", err));
      }, 3000);
    }

    // 8. Return Order Details to Client
    return NextResponse.json({
      success: true,
      razorpayOrderId: orderId,
      amount: amountInPaise,
      consultationId: consultation.id,
    });

  } catch (error: any) {
    console.error("Consultation booking error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing booking" },
      { status: 500 }
    );
  }
}
