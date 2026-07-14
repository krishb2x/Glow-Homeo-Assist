import { LogisticsProvider } from "./provider";
import { ServiceabilityInput, ServiceabilityOutput, ShipmentInput, ShipmentOutput } from "./types";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export class ShiprocketProvider implements LogisticsProvider {
  name = "shiprocket";

  private async getAuthToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
      return cachedToken;
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      throw new Error("Shiprocket credentials (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD) are missing in environment variables.");
    }

    try {
      const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Shiprocket auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("Token missing from Shiprocket auth response.");
      }

      cachedToken = data.token;
      // Token is valid for 24 hours, expire cache in 23 hours to be safe
      tokenExpiry = now + 23 * 60 * 60 * 1000;
      return data.token;
    } catch (error) {
      console.error("[Shiprocket Auth Error]:", error);
      throw error;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
    };

    const url = `https://apiv2.shiprocket.in/v1/external${endpoint}`;
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Shiprocket API error (${res.status} on ${endpoint}): ${errorText}`);
    }

    return res.json();
  }

  async checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityOutput> {
    try {
      const weightKg = input.weightGrams / 1000;
      const codFlag = input.isCod ? 1 : 0;
      const endpoint = `/courier/serviceability/?pickup_postcode=${input.pickupPincode}&delivery_postcode=${input.deliveryPincode}&weight=${weightKg}&cod=${codFlag}`;

      const res = await this.request(endpoint, { method: "GET" });

      if (res.status === 200 && res.data && res.data.available_courier_companies) {
        const couriers = res.data.available_courier_companies;
        if (couriers.length > 0) {
          // Find the courier with the lowest freight charge
          const sorted = couriers.sort((a: any, b: any) => Number(a.rate) - Number(b.rate));
          const bestCourier = sorted[0];

          return {
            isServiceable: true,
            codAvailable: couriers.some((c: any) => c.cod === 1),
            estimatedDays: bestCourier.etd_hours ? Math.ceil(bestCourier.etd_hours / 24) : 4,
            shippingCharge: Number(bestCourier.rate || 0),
            carrierName: bestCourier.courier_name,
          };
        }
      }

      // Fallback: If no couriers are returned by Shiprocket, allow standard SpeedPost delivery
      return {
        isServiceable: true,
        codAvailable: true,
        estimatedDays: 5,
        shippingCharge: 60.00,
        carrierName: "India Post (SpeedPost)",
      };
    } catch (error) {
      console.error("[Shiprocket Serviceability Check Failed]:", error);
      // Fallback to standard delivery instead of blocking checkout on network/auth errors
      return {
        isServiceable: true,
        codAvailable: true,
        estimatedDays: 5,
        shippingCharge: 60.00,
        carrierName: "Standard Delivery",
      };
    }
  }

  async createShipment(input: ShipmentInput): Promise<ShipmentOutput> {
    // 1. Create order on Shiprocket
    const weightKg = input.totalWeightGrams / 1000;
    const nameParts = input.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || ".";

    const orderPayload = {
      order_id: input.orderNumber,
      order_date: new Date().toISOString().replace("T", " ").substring(0, 16),
      pickup_location: input.pickupLocationName,
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: input.street,
      billing_landmark: input.landmark || "",
      billing_city: input.city,
      billing_pincode: input.pincode,
      billing_state: input.state,
      billing_country: "India",
      billing_email: input.customerEmail,
      billing_phone: input.customerPhone,
      shipping_is_billing: true,
      order_items: input.items.map(item => ({
        name: item.name,
        sku: item.sku,
        units: item.quantity,
        selling_price: item.price,
        hsn: item.hsn ? parseInt(item.hsn) : 4901,
      })),
      payment_method: input.isCod ? "COD" : "Prepaid",
      sub_total: input.isCod ? input.codAmount : input.items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      length: input.lengthCm,
      width: input.widthCm,
      height: input.heightCm,
      weight: weightKg,
    };

    const orderRes = await this.request("/orders/create/adhoc", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.order_id || !orderRes.shipment_id) {
      throw new Error(`Failed to create order on Shiprocket. Response: ${JSON.stringify(orderRes)}`);
    }

    const providerOrderId = String(orderRes.order_id);
    const providerShipmentId = String(orderRes.shipment_id);

    // 2. Assign AWB (Auto-assigns best courier automatically)
    let awbCode = "";
    let courierName = "";
    try {
      const awbRes = await this.request("/courier/assign/awb", {
        method: "POST",
        body: JSON.stringify({ shipment_id: providerShipmentId }),
      });

      if (awbRes.awb_assign_status === 1 && awbRes.response && awbRes.response.data) {
        awbCode = awbRes.response.data.awb_code || "";
        courierName = awbRes.response.data.courier_name || "";
      }
    } catch (awbError) {
      console.error("[Shiprocket AWB Assignment Failed]:", awbError);
      // Do not throw; we can still save the order and retry AWB assignment from the Admin dashboard
    }

    // 3. Generate Shipping Label
    let labelUrl = "";
    if (awbCode) {
      try {
        const labelRes = await this.request("/courier/generate/label", {
          method: "POST",
          body: JSON.stringify({ shipment_id: [providerShipmentId] }),
        });
        if (labelRes.label_created === 1 && labelRes.label_url) {
          labelUrl = labelRes.label_url;
        }
      } catch (labelError) {
        console.error("[Shiprocket Label Generation Failed]:", labelError);
      }
    }

    return {
      providerOrderId,
      providerShipmentId,
      awbCode,
      courierName,
      labelUrl,
      status: awbCode ? "MANIFESTED" : "PENDING",
      rawResponse: orderRes,
    };
  }

  async cancelShipment(providerOrderId: string): Promise<boolean> {
    try {
      const res = await this.request("/orders/cancel", {
        method: "POST",
        body: JSON.stringify({ ids: [providerOrderId] }),
      });
      return res.status_code === 200;
    } catch (err) {
      console.error("[Shiprocket Shipment Cancellation Failed]:", err);
      return false;
    }
  }

  async generateLabel(providerShipmentId: string): Promise<string> {
    try {
      const res = await this.request("/courier/generate/label", {
        method: "POST",
        body: JSON.stringify({ shipment_id: [providerShipmentId] }),
      });
      if (res.label_created === 1 && res.label_url) {
        return res.label_url;
      }
      throw new Error(res.message || "Failed to generate label");
    } catch (err: any) {
      console.error("[Shiprocket Label Generation Failed]:", err);
      throw err;
    }
  }
}
