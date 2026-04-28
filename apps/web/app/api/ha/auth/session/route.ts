import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
