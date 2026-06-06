import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import * as z from "zod";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.MEDITONIC_RAZORPAY_KEY_SECRET || "",
  });
}

const orderSchema = z.object({
  slug: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  shippingAddress: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedData = orderSchema.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { slug, name, email, phone, shippingAddress } = parsedData.data;
    const supabase = createAdminClient();
    const clinicId = BRAND.clinicId;

    // 1. Get eBook Details
    const { data: ebook, error: ebookError } = await supabase
      .from("mt_ebooks")
      .select("id, price, title")
      .eq("slug", slug)
      .single();

    // Use dummy price if ebook not in DB yet during dev
    const price = ebook ? ebook.price : 499;

    // 2. Upsert Patient/Customer
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
        })
        .select()
        .single();
      if (newPatient) {
        patientId = newPatient.id;
      } else {
        throw new Error("Could not create patient record");
      }
    }

    // 3. Create eBook Order (Pending)
    const deliveryMethod = shippingAddress 
      ? `Physical Shipping: ${shippingAddress}`
      : 'email';

    const { data: order, error: orderError } = await supabase
      .from("mt_ebook_orders")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        total_amount: price,
        payment_status: "created",
        delivery_status: "pending",
        delivered_via: deliveryMethod,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    // 4. Create Razorpay Order
    const amountInPaise = price * 100;
    const rzpOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `ebk_${order.id.substring(0, 8)}`,
      notes: {
        ebook_order_id: order.id,
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
        currency: "INR",
        razorpay_order_id: rzpOrder.id,
        status: "created",
        purpose: "ebook",
        reference_id: order.id,
      });

    return NextResponse.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      orderId: order.id,
    });

  } catch (error: any) {
    console.error("eBook order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
