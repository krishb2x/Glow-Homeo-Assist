import { createClient } from "@supabase/supabase-js";
import { isReferralApplicable } from "../apps/meditonic/lib/referrals/product-mapping";
import { BRAND } from "../apps/meditonic/lib/constants";
import dotenv from "dotenv";

dotenv.config({ path: "d:/HomeoAssist/.env" });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "http://localhost:3001";

async function runTests() {
  console.log("=== Starting Referral Integration Tests ===");

  // 1. Setup Test Partner
  console.log("Setting up test partner...");
  const { data: partnerApp, error: appErr } = await supabase
    .from("mt_partner_applications")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      name: "Test Doctor Partner",
      email: `test_doc_${Date.now()}@example.com`,
      mobile: "9999988888",
      profession: "Practitioner",
      status: "approved"
    })
    .select()
    .single();

  if (appErr) throw appErr;

  const { data: partner, error: partnerErr } = await supabase
    .from("mt_partners")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      application_id: partnerApp.id,
      base_commission_rate: 20.00, // Custom Partner commission rate (Priority 2)
      partner_type: "influencer", // Influencer has default 15% (Priority 3)
      status: "active"
    })
    .select()
    .single();

  if (partnerErr) throw partnerErr;
  console.log(`Created Partner ID: ${partner.id} with Base Commission Override: ${partner.base_commission_rate}%`);

  // 2. Setup Test Codes
  console.log("\nCreating test referral codes...");
  
  // Code A & B: Restricted to Treatment Kits
  const rand = () => Math.random().toString(36).substring(2, 7).toUpperCase();
  const codeKitId = `TKIT_${rand()}`;
  const { data: codeKit, error: codeKitErr } = await supabase
    .from("mt_referral_codes")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      partner_id: partner.id,
      code: codeKitId,
      discount_type: "percentage",
      discount_value: 10,
      is_active: true
    })
    .select()
    .single();

  if (codeKitErr) {
    console.error("Error creating codeKit:", codeKitErr);
    throw codeKitErr;
  }

  const { error: prodRelErr } = await supabase.from("mt_referral_products").insert({
    referral_code_id: codeKit.id,
    product_type: "course"
  });
  if (prodRelErr) {
    console.error("Error creating referral product mapping:", prodRelErr);
    throw prodRelErr;
  }

  // Code C: Expired
  const codeExpiredId = `TEXP_${rand()}`;
  const { data: codeExpired, error: codeExpiredErr } = await supabase
    .from("mt_referral_codes")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      partner_id: partner.id,
      code: codeExpiredId,
      discount_type: "percentage",
      discount_value: 10,
      is_active: true,
      end_date: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    })
    .select()
    .single();

  if (codeExpiredErr) {
    console.error("Error creating codeExpired:", codeExpiredErr);
    throw codeExpiredErr;
  }

  // Code D: Usage limit exceeded
  const codeLimitId = `TLIM_${rand()}`;
  const { data: codeLimit, error: codeLimitErr } = await supabase
    .from("mt_referral_codes")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      partner_id: partner.id,
      code: codeLimitId,
      discount_type: "percentage",
      discount_value: 10,
      is_active: true,
      usage_limit: 1,
      current_usage: 1
    })
    .select()
    .single();

  if (codeLimitErr) {
    console.error("Error creating codeLimit:", codeLimitErr);
    throw codeLimitErr;
  }

  // Code E: Commission override
  const codeOverrideId = `TOVR_${rand()}`;
  const { data: codeOverride, error: codeOverrideErr } = await supabase
    .from("mt_referral_codes")
    .insert({
      clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
      partner_id: partner.id,
      code: codeOverrideId,
      discount_type: "percentage",
      discount_value: 10,
      commission_rate: 35.00, // Priority 1 override
      is_active: true
    })
    .select()
    .single();

  if (codeOverrideErr) {
    console.error("Error creating codeOverride:", codeOverrideErr);
    throw codeOverrideErr;
  }

  console.log("Codes created successfully.");

  // 3. Test Scenarios A-D via validation API
  console.log("\n=== Running API Validation Tests ===");

  const kitItem = {
    product: {
      id: "prod-kit-1",
      product_type: "COURSE"
    },
    quantity: 1
  };

  const ebookItem = {
    product: {
      id: "prod-ebook-1",
      product_type: "EBOOK"
    },
    quantity: 1
  };

  // Scenario A: Apply TESTKIT on Treatment Kit (Expected: Valid)
  console.log("\nScenario A: Apply TESTKIT code on Treatment Kit item...");
  let res = await fetch(`${BASE_URL}/api/referral/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeKitId, items: [kitItem] })
  });
  let data = await res.json() as any;
  console.log(`Status: ${res.status}, Success: ${data.success}, Error: ${data.error}`);
  if (!data.success) throw new Error("Scenario A failed");

  // Scenario B: Apply TESTKIT on eBook (Expected: Invalid)
  console.log("\nScenario B: Apply TESTKIT code on eBook item...");
  res = await fetch(`${BASE_URL}/api/referral/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeKitId, items: [ebookItem] })
  });
  data = await res.json() as any;
  console.log(`Status: ${res.status}, Success: ${data.success}, Error: ${data.error}`);
  if (data.success || !data.error?.includes("not valid for any items")) throw new Error("Scenario B failed");

  // Scenario C: Apply Expired code (Expected: Invalid)
  console.log("\nScenario C: Apply Expired code...");
  res = await fetch(`${BASE_URL}/api/referral/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeExpiredId, items: [kitItem] })
  });
  data = await res.json() as any;
  console.log(`Status: ${res.status}, Success: ${data.success}, Error: ${data.error}`);
  if (data.success || !data.error?.includes("expired")) throw new Error("Scenario C failed");

  // Scenario D: Apply Limit Exceeded code (Expected: Invalid)
  console.log("\nScenario D: Apply Limit Exceeded code...");
  res = await fetch(`${BASE_URL}/api/referral/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeLimitId, items: [kitItem] })
  });
  data = await res.json() as any;
  console.log(`Status: ${res.status}, Success: ${data.success}, Error: ${data.error}`);
  if (data.success || !data.error?.includes("limit reached")) throw new Error("Scenario D failed");

  // Scenario D2: GET validate request (Expected: Valid)
  console.log("\nScenario D2: GET validate request for consultation...");
  res = await fetch(`${BASE_URL}/api/referral/validate?code=${encodeURIComponent(codeKitId)}&productType=course`);
  data = await res.json() as any;
  console.log(`Status: ${res.status}, Success: ${data.success}, Error: ${data.error}`);
  if (!data.success) throw new Error("Scenario D2 failed");

  // 4. Test Scenario E: Commission calculations & override logic
  console.log("\n=== Testing Commission Logic (Scenario E) ===");
  
  // We trigger the webhook logic by calling /api/webhooks/razorpay with simulated capture
  // For TESTOVR (Code commission rate: 35%)
  const grossAmount = 1000.00; // Rs 1000 order value
  const mockOrderId = `order_mock_${Date.now()}`;

  // First create a pending payment in mt_payments to mimic actual razorpay flow
  const { error: payInsertErr } = await supabase.from("mt_payments").insert({
    clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
    patient_id: "e15c55e6-2e76-477c-ad9a-d66a54931cc9", // valid patient ID
    amount: grossAmount,
    original_amount: grossAmount,
    currency: "INR",
    razorpay_order_id: mockOrderId,
    status: "created",
    purpose: "treatment_kit",
    reference_id: "616e3f5e-996f-4ca2-9661-7e5fa16b3fa9", // any active case ID
    referral_code_id: codeOverride.id
  });
  if (payInsertErr) {
    console.error("Error inserting mt_payments record:", payInsertErr);
    throw payInsertErr;
  }

  console.log(`Triggering Razorpay payment capture webhook for order ${mockOrderId}...`);
  const whRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
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
            id: `pay_mock_${Date.now()}`,
            order_id: mockOrderId,
            amount: grossAmount * 100 // in paise
          }
        }
      }
    })
  });

  console.log(`Webhook response status: ${whRes.status}`);
  if (!whRes.ok) throw new Error("Webhook trigger failed");

  // Fetch created attribution to verify math
  console.log("Verifying calculated commission amount in attribution database...");
  const { data: attribution } = await supabase
    .from("mt_order_attributions")
    .select("*")
    .eq("order_id", "616e3f5e-996f-4ca2-9661-7e5fa16b3fa9") // reference_id
    .eq("referral_code_id", codeOverride.id)
    .single();

  if (!attribution) throw new Error("Attribution record not created by webhook!");

  console.log(`Gross Revenue: ₹${grossAmount}`);
  console.log(`Calculated Commission Rate Used: ${attribution.commission_percentage}%`);
  console.log(`Calculated Commission Amount: ₹${attribution.commission_amount}`);
  
  // Math verification:
  // gst = 1000 * 0.18 = 180
  // pg = 1000 * 0.02 = 20
  // gh = 1000 * 0.07 = 70
  // net = 1000 - 180 - 20 - 70 = 730
  // commission = 730 * 35% = 255.5
  const expectedNet = grossAmount - (grossAmount * 0.18) - (grossAmount * 0.02) - (grossAmount * 0.07);
  const expectedCommission = (expectedNet * 35) / 100;
  
  console.log(`Expected Net: ₹${expectedNet}, Expected Commission: ₹${expectedCommission}`);
  
  if (Math.abs(Number(attribution.commission_amount) - expectedCommission) > 0.01) {
    throw new Error("Commission math mismatch!");
  }
  
  console.log("✅ Commission calculations, override rates, and priorities match perfectly!");

  // Clean up
  console.log("\nCleaning up test records...");
  await supabase.from("mt_order_attributions").delete().eq("referral_code_id", codeOverride.id);
  await supabase.from("mt_payments").delete().eq("razorpay_order_id", mockOrderId);
  await supabase.from("mt_referral_products").delete().eq("referral_code_id", codeKit.id);
  await supabase.from("mt_referral_codes").delete().in("id", [codeKit.id, codeExpired.id, codeLimit.id, codeOverride.id]);
  await supabase.from("mt_partners").delete().eq("id", partner.id);
  await supabase.from("mt_partner_applications").delete().eq("id", partnerApp.id);
  console.log("Cleanup finished.");

  console.log("\n🎉 ALL REFERRAL INTEGRATION TESTS PASSED!");
}

runTests().catch(err => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
