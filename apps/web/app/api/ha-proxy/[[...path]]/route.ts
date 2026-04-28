import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function backendBase(): string {
  const b = process.env.API_URL;
  if (b && b.length > 0) return b.replace(/\/$/, "");
  return "http://127.0.0.1:4000";
}

async function proxy(request: NextRequest, pathSegments: string[] | undefined): Promise<Response> {
  // Accept token from cookie (server-side sessions) or Authorization header (localStorage sessions).
  const cookieToken = (await cookies()).get("gh_session")?.value ?? null;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const segs = pathSegments ?? [];
  if (segs.length === 0) {
    return NextResponse.json({ success: false, error: "Bad path" }, { status: 400 });
  }

  // Rebuild the path preserving structure (do NOT encode slashes between segments)
  const subpath = segs.join("/");
  const u = new URL(request.url);
  const target = `${backendBase()}/${subpath}${u.search}`;

  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) h.set("Content-Type", contentType);
  h.set("Accept", request.headers.get("accept") ?? "application/json");
  const clinicId = request.headers.get("x-clinic-id");
  if (clinicId) h.set("X-Clinic-Id", clinicId);

  const method = request.method;
  const init: RequestInit = { method, headers: h, redirect: "follow" };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    return await fetch(target, init);
  } catch {
    return NextResponse.json(
      { success: false, error: "API unreachable. Make sure the backend server is running." },
      { status: 502 }
    );
  }
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, c: Ctx) {
  return proxy(request, (await c.params).path);
}
export async function POST(request: NextRequest, c: Ctx) {
  return proxy(request, (await c.params).path);
}
export async function PUT(request: NextRequest, c: Ctx) {
  return proxy(request, (await c.params).path);
}
export async function PATCH(request: NextRequest, c: Ctx) {
  return proxy(request, (await c.params).path);
}
export async function DELETE(request: NextRequest, c: Ctx) {
  return proxy(request, (await c.params).path);
}
