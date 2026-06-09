export const maxDuration = 300; // Allow up to 5 minutes for large PDF processing
import { NextResponse } from "next/server";
import { processStoreFulfillment } from "@/lib/storeFulfillment";

export async function POST(req: Request) {
  try {
    const { mtOrderId } = await req.json();

    if (!mtOrderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const internalSecret = req.headers.get("x-internal-secret");
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await processStoreFulfillment(mtOrderId);

    return NextResponse.json({ success: true, fulfilled: true });
  } catch (error: any) {
    console.error("Fulfillment Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
