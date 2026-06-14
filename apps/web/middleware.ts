import { NextRequest, NextResponse } from "next/server";

/**
 * Security headers for all responses. Auth for app routes is enforced client-side
 * (ClinicAppShell) and the API via Bearer token; the browser does not send httpOnly
 * session cookies to localhost:3000 from localhost:4000 in dev.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get("gh_session")?.value;
  const role = request.cookies.get("gh_role")?.value?.toLowerCase();

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isPartnerRoute = pathname.startsWith("/partner") && pathname !== "/partner/login" && pathname !== "/partner-login";
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isPatientRoute = pathname.startsWith("/patient");

  // Auth & RBAC Checks
  if (isAdminRoute || isPartnerRoute || isDoctorRoute || isPatientRoute) {
    if (!session) {
      // Determine respective login URL
      let loginUrlPath = "/login";
      if (isPartnerRoute) {
        loginUrlPath = "/partner/login";
      }
      
      const loginUrl = new URL(loginUrlPath, request.url);
      loginUrl.searchParams.set("next", pathname);
      
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }

    // Role-based Access Control
    if (isAdminRoute && !["admin", "super_admin", "staff", "support"].includes(role || "")) {
      const landing = role === "partner" ? "/partner-dashboard" : "/dashboard";
      return addSecurityHeaders(NextResponse.redirect(new URL(landing, request.url)));
    }

    if (isPartnerRoute && role !== "partner") {
      const landing = ["admin", "super_admin", "staff", "support"].includes(role || "") ? "/admin" : "/dashboard";
      return addSecurityHeaders(NextResponse.redirect(new URL(landing, request.url)));
    }

    if (isDoctorRoute && role !== "doctor") {
      const landing = role === "patient" ? "/patient" : "/dashboard";
      return addSecurityHeaders(NextResponse.redirect(new URL(landing, request.url)));
    }

    if (isPatientRoute && role !== "patient") {
      const landing = "/dashboard";
      return addSecurityHeaders(NextResponse.redirect(new URL(landing, request.url)));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse) {
  // API HTTP calls go through /api/ha-proxy (same-origin, no CORS needed).
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none';"
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(self), camera=(), payment=()"
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (response.headers.get("Cache-Control") === null) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
