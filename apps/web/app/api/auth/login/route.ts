import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function backendBase(): string {
  const b = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (b && b.length > 0) {
    return b.replace(/\/$/, "");
  }
  return "http://127.0.0.1:4000";
}

/**
 * Same-origin login proxy: browser → Next → Express.
 * Avoids CORS/localhost quirks and does not require NEXT_PUBLIC_* to be set for sign-in to work.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const target = `${backendBase()}/auth/login`;
  let res: Response;
  try {
    res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        Accept: "application/json"
      },
      body
    });
  } catch {
    return NextResponse.json(
      {
        error: "API unreachable",
        message:
          "The backend is not running or API_URL in the monorepo root .env is wrong. Start it with: npm run dev:api (default http://127.0.0.1:4000)."
      },
      { status: 502 }
    );
  }
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" }
  });
}
