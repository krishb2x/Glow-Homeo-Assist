import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase";
import { getLogisticsProvider } from "../../../../lib/logistics";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode");
    const weightGrams = parseInt(searchParams.get("weight") || "500", 10);
    const isCod = searchParams.get("cod") === "true";

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: "Invalid PIN code. Must be 6 digits." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const cachingLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Check Pincode Cache
    const { data: cached, error: cacheErr } = await supabase
      .from("mt_pincode_cache")
      .select("*")
      .eq("pincode", pincode)
      .gt("updated_at", cachingLimit)
      .single();

    if (cached) {
      console.log(`[Pincode Cache Hit] Pincode: ${pincode}, Serviceable: ${cached.is_serviceable}`);
      return NextResponse.json({
        isServiceable: cached.is_serviceable,
        codAvailable: cached.cod_available,
        estimatedDays: cached.estimated_days,
        shippingCharge: cached.shipping_charge,
      });
    }

    // 2. Cache Miss: Fetch pickup location and default provider configuration
    // Fetch default shipping location
    const { data: location } = await supabase
      .from("mt_shipping_locations")
      .select("pincode")
      .eq("is_default", true)
      .limit(1)
      .single();

    const pickupPincode = location?.pincode || "110001"; // Fallback to default clinic pincode

    // Fetch default provider
    const { data: providerConfig } = await supabase
      .from("mt_logistics_providers")
      .select("provider")
      .eq("enabled", true)
      .eq("default_provider", true)
      .limit(1)
      .single();

    const providerName = providerConfig?.provider || "shiprocket";

    console.log(`[Pincode Cache Miss] Querying ${providerName} for pincode ${pincode} from pickup ${pickupPincode}`);
    const provider = getLogisticsProvider(providerName);
    const result = await provider.checkServiceability({
      pickupPincode,
      deliveryPincode: pincode,
      weightGrams,
      isCod,
    });

    // 3. Save to Cache
    await supabase
      .from("mt_pincode_cache")
      .upsert({
        pincode,
        is_serviceable: result.isServiceable,
        cod_available: result.codAvailable,
        estimated_days: result.estimatedDays,
        shipping_charge: result.shippingCharge,
        updated_at: now,
      });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Pincode Serviceability API Error]:", error);
    // Industry standard fallback: Do not block checkout if logistics API is down/throttled
    return NextResponse.json({
      isServiceable: true,
      codAvailable: true,
      estimatedDays: 5,
      shippingCharge: 60.00,
      is_fallback: true
    });
  }
}
