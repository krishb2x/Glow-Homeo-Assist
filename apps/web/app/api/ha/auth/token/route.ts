import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Same-origin only: exposes the access token to the browser for WebSocket and rare client-only needs. */
export async function GET() {
  const t = (await cookies()).get("gh_session")?.value;
  if (!t) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ accessToken: t });
}
