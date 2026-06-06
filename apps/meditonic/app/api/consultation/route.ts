import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase";
import { bookingFormSchema } from "@/lib/validations";
import { BRAND } from "@/lib/constants";

// Lazy-init Razorpay to avoid crashes at build time when env vars are missing
function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
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
      .select("price")
      .eq("clinic_id", clinicId)
      .eq("type", data.type)
      .single();

    if (feeError || !feeData) {
      console.error("Failed to fetch price for consultation type:", data.type);
      return NextResponse.json({ error: "Invalid consultation type or price not found" }, { status: 400 });
    }

    const price = feeData.price;

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
      })
      .select("id")
      .single();

    if (consultationError) throw consultationError;

    // 6. Create Razorpay Order
    const amountInPaise = price * 100;
    
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

    const order = await getRazorpay().orders.create(options);

    // 7. Create Payment Record (Pending)
    const { error: paymentError } = await supabase
      .from("mt_payments")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        amount: price,
        currency: "INR",
        razorpay_order_id: order.id,
        status: "created",
        purpose: "consultation",
        reference_id: consultation.id,
      });

    if (paymentError) throw paymentError;

    // 8. Return Order Details to Client
    return NextResponse.json({
      success: true,
      razorpayOrderId: order.id,
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
