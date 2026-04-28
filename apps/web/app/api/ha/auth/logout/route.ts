import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = {
  path: "/",
  maxAge: 0,
  httpOnly: true,
  sameSite: "lax" as const
};

export async function POST() {
  const c = await cookies();
  c.set("gh_session", "", { ...COOKIE, secure: process.env.NODE_ENV === "production" });
  c.set("gh_role", "", { ...COOKIE, secure: process.env.NODE_ENV === "production" });
  c.set("gh_clinic_id", "", { ...COOKIE, secure: process.env.NODE_ENV === "production" });
  return NextResponse.json({ ok: true });
}
