import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Read cookies
  const session = request.cookies.get("meditonic_session")?.value;
  const role = request.cookies.get("meditonic_role")?.value;

  const isAdminRoute = pathname.startsWith("/admin");
  const isPartnerRoute = pathname.startsWith("/partner-dashboard") || pathname.startsWith("/partner");
  
  const isLoginPage = pathname === "/admin/login" || pathname === "/partner-login" || pathname === "/partner/login";

  // If authenticated and tries to hit login page, redirect directly to dashboard
  if (isLoginPage && session) {
    if (role === "partner") {
      return NextResponse.redirect(new URL("/partner-dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // 1. Protection for Admin routes (/admin/*)
  if (isAdminRoute && !isLoginPage) {
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Restrict partners from accessing admin
    if (role === "partner") {
      return NextResponse.redirect(new URL("/partner-dashboard", request.url));
    }
  }

  // 2. Protection for Partner routes (/partner-dashboard/*, /partner/*)
  if (isPartnerRoute && !isLoginPage) {
    if (!session) {
      const loginUrl = new URL("/partner-login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Restrict non-partners (e.g. admin, support) from partner routes
    if (role !== "partner") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/partner-dashboard/:path*",
    "/partner/:path*",
    "/partner-login"
  ]
};
