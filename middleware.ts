import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================
// Authentication Middleware
// ============================================
// Simple password protection for the entire app
// Protects /canvas and all /api routes

const PROTECTED_PATHS = ["/canvas", "/api"];
const PUBLIC_PATHS = ["/api/auth/login"]; // Allow login endpoint

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path needs protection
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!isProtected || isPublic) {
    return NextResponse.next();
  }

  // Check for auth token in cookie
  const authToken = request.cookies.get("auth-token")?.value;
  const validToken = process.env.AUTH_TOKEN;

  if (!validToken) {
    // No password configured - allow access (development mode)
    console.warn("WARNING: AUTH_TOKEN not configured - app is unprotected!");
    return NextResponse.next();
  }

  if (authToken !== validToken) {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Return 401 for API requests
    return NextResponse.json(
      { error: "Unauthorized - Invalid or missing authentication" },
      { status: 401 }
    );
  }

  // Valid auth - allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - / (landing page)
     * - /login (login page)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico|login$|$).*)",
  ],
};
