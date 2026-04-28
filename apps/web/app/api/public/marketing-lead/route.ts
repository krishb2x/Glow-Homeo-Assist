import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function backendBase(): string {
  const b = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (b && b.length > 0) return b.replace(/\/$/, "");
  return "http://127.0.0.1:4000";
}

/**
 * Server-side proxy for POST /public/marketing-lead.
 * Browser → Next.js (same origin, no CORS) → Express (server-to-server).
 * This ensures the lead form works from any device / network without CORS issues.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${backendBase()}/public/marketing-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" }
    });
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
