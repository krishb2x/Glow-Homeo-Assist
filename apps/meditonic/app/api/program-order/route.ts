import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "../../../lib/supabase";
import { BRAND } from "../../../lib/constants";
import * as z from "zod";
import { isReferralApplicable, findReferralOverride } from "../../../lib/referrals/product-mapping";


function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.MEDITONIC_RAZORPAY_KEY_SECRET || "",
  });
}

const programOrderSchema = z.object({
  programId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  age: z.number().optional(),
  gender: z.string().optional(),
  referralCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedData = programOrderSchema.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json({ error: "Invalid data", details: parsedData.error.errors }, { status: 400 });
    }

    const { programId, name, email, phone, age, gender, referralCode } = parsedData.data;
    const supabase = createAdminClient();
    const clinicId = BRAND.clinicId;

    // 1. Determine Price dynamically
    let originalPrice = programId === "glow_skin" ? 2499 : 1999;
    let price = originalPrice;
    let discountApplied = 0;
    let referralCodeId = null;

    // Process Referral Code if provided
    if (referralCode) {
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
        .ilike("code", referralCode)
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
        let override = findReferralOverride(referralData.mt_referral_products, programId, "program");

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

    // 2. Upsert Patient
    let patientId: string;
    const { data: existingPatient } = await supabase
      .from("mt_patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("phone", phone)
      .single();

    if (existingPatient) {
      patientId = existingPatient.id;
    } else {
      const { data: newPatient } = await supabase
        .from("mt_patients")
        .insert({
          clinic_id: clinicId,
          name,
          email,
          phone,
          age,
          gender,
        })
        .select()
        .single();
      if (newPatient) {
        patientId = newPatient.id;
      } else {
        throw new Error("Could not create patient record");
      }
    }

    // 3. Create Program Enrollment (Pending)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("mt_program_enrollments")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        program_slug: programId,
        status: "pending_payment",
        price_charged: price,
      })
      .select("id")
      .single();

    if (enrollmentError) throw enrollmentError;

    // 4. Create Razorpay Order
    const amountInPaise = price * 100;
    const rzpOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `prg_${enrollment.id.substring(0, 8)}`,
      notes: {
        enrollment_id: enrollment.id,
        patient_id: patientId,
        clinic_id: clinicId,
      },
    });

    // 5. Create Payment Record
    await supabase
      .from("mt_payments")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        amount: price,
        original_amount: originalPrice,
        discount_applied: discountApplied,
        currency: "INR",
        razorpay_order_id: rzpOrder.id,
        status: "created",
        purpose: "program",
        reference_id: enrollment.id,
        referral_code_id: referralCodeId,
      });

    // DEV ONLY MOCK
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
                  order_id: rzpOrder.id,
                  amount: amountInPaise
                }
              }
            }
          })
        }).catch(console.error);
      }, 3000);
    }

    return NextResponse.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      enrollmentId: enrollment.id,
    });

  } catch (error: any) {
    console.error("Program order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
