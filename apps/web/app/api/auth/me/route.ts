import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function backendBase(): string {
  const b = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (b && b.length > 0) return b.replace(/\/$/, "");
  return "http://127.0.0.1:4000";
}

/**
 * Server-side proxy for GET /auth/me.
 * Browser → Next.js (same origin, no CORS) → Express (server-to-server, no CORS).
 * Accepts the Supabase access token in the Authorization header and forwards it.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  try {
    const res = await fetch(`${backendBase()}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      }
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" }
    });
  } catch {
    return NextResponse.json(
      {
        error: "API unreachable",
        message:
          "The backend API is not running. Start it with: npm run dev:api"
      },
      { status: 502 }
    );
  }
}
