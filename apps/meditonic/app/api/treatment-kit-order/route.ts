import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "../../../lib/supabase";
import { BRAND } from "../../../lib/constants";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID || process.env.MEDITONIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.MEDITONIC_RAZORPAY_KEY_SECRET || "",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, age, gender, symptoms, symptomDescription, slug, photoUrl, reportUrl } = body;

    // Validate inputs
    if (!name || !phone || !gender || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const clinicId = BRAND.clinicId;

    // 1. Fetch the TREATMENT_KIT product details to get its price
    const { data: product, error: productError } = await supabase
      .from("mt_products")
      .select("id, title, price")
      .eq("clinic_id", clinicId)
      .eq("slug", slug)
      .eq("product_type", "TREATMENT_KIT")
      .single();

    if (productError || !product) {
      console.error("Failed to find treatment kit product:", slug, productError);
      return NextResponse.json({ error: "Invalid treatment kit slug or product not found" }, { status: 400 });
    }

    const price = product.price;

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
      await supabase
        .from("mt_patients")
        .update({ name, email: email || null, age: age ? Number(age) : null, gender })
        .eq("id", patientId);
    } else {
      const { data: newPatient, error: patientError } = await supabase
        .from("mt_patients")
        .insert({
          clinic_id: clinicId,
          name,
          email: email || null,
          phone,
          age: age ? Number(age) : null,
          gender,
        })
        .select("id")
        .single();

      if (patientError) throw patientError;
      patientId = newPatient.id;
    }

    // 3. Create Case Record (Immediate Lead Capture, Pending Payment)
    const { data: newCase, error: caseError } = await supabase
      .from("mt_cases")
      .insert({
        clinic_id: clinicId,
        case_type: "treatment_kit",
        treatment_type: slug,
        patient_name: name,
        mobile: phone,
        email: email || null,
        age: age ? Number(age) : null,
        gender,
        concern_category: product.title,
        description: symptomDescription || null,
        source: "website",
        payment_status: "pending",
        status: "new",
        workflow_status: "doctor_review",
        metadata: {
          symptoms: symptoms || [],
          photoUrl: photoUrl || null,
          reportUrl: reportUrl || null,
          kit_product_id: product.id,
          kit_title: product.title
        }
      })
      .select("id")
      .single();

    if (caseError) {
      console.error("Failed to create mt_cases record:", caseError);
      throw caseError;
    }

    // 4. Create Razorpay Order
    const amountInPaise = Math.round(price * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${newCase.id.substring(0, 8)}`,
      notes: {
        case_id: newCase.id,
        patient_id: patientId,
        clinic_id: clinicId,
        purpose: "treatment_kit"
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

    // 5. Create Payment Record (Pending)
    const { error: paymentError } = await supabase
      .from("mt_payments")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        amount: price,
        original_amount: price,
        discount_applied: 0,
        currency: "INR",
        razorpay_order_id: orderId,
        status: "created",
        purpose: "treatment_kit",
        reference_id: newCase.id,
      });

    if (paymentError) {
      console.error("Failed to create payment record:", paymentError);
      throw paymentError;
    }

    // Log Activity
    await supabase.from("mt_case_activities").insert({
      case_id: newCase.id,
      action: "Case Created",
      details: { message: `Treatment Kit case initiated for ${product.title}`, orderId }
    });

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

    return NextResponse.json({
      success: true,
      razorpayOrderId: orderId,
      amount: amountInPaise,
      caseId: newCase.id,
    });

  } catch (error: any) {
    console.error("Treatment Kit checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing treatment kit request" },
      { status: 500 }
    );
  }
}
