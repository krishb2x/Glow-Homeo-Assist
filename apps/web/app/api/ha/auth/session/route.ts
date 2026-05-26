import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const COOKIE_BASE = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const
};

const bodySchema = z.object({
  accessToken: z.string().min(20),
  role: z.string().min(1),
  clinicId: z.string().uuid().nullable().optional()
});

export async function GET(): Promise<NextResponse> {
  const c = await cookies();
  const t = c.get("gh_session")?.value;
  if (!t) {
    return NextResponse.json({ signedIn: false as const }, { status: 200 });
  }
  return NextResponse.json({
    signedIn: true as const,
    profileRole: c.get("gh_role")?.value ?? null,
    clinicId: c.get("gh_clinic_id")?.value || null
  });
}

/** Set httpOnly session cookies after successful staff login. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid session payload" }, { status: 400 });
  }
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 8;
  const c = await cookies();
  c.set("gh_session", parsed.data.accessToken, { ...COOKIE_BASE, secure, maxAge });
  c.set("gh_role", parsed.data.role.toLowerCase(), { ...COOKIE_BASE, secure, maxAge });
  if (parsed.data.clinicId) {
    c.set("gh_clinic_id", parsed.data.clinicId, { ...COOKIE_BASE, secure, maxAge });
  }
  return NextResponse.json({ ok: true });
}
