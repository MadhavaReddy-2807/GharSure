import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "gharsure_session";

async function verifyToken(token: string) {
  try {
    const secret = process.env.AUTH_SESSION_SECRET || "gharsure-development-super-secure-jwt-signing-key-32-chars-minimum";
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and internal next routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = Boolean(session);
  const isOnboardingCompleted = Boolean(session?.onboardingCompleted);

  // Protected app routes
  const isAppRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/rewards") ||
    pathname.startsWith("/refer") ||
    pathname.startsWith("/store");

  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isAuthRoute = pathname.startsWith("/auth");

  // 1. Unauthenticated users trying to access protected routes -> redirect to /auth
  if ((isAppRoute || isOnboardingRoute) && !isAuthenticated) {
    const loginUrl = new URL("/auth", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user with incomplete onboarding trying to access /home, /rewards, etc. -> redirect to /onboarding
  if (isAppRoute && isAuthenticated && !isOnboardingCompleted) {
    const onboardingUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // 3. Authenticated user with complete onboarding trying to access /onboarding -> redirect to /home
  if (isOnboardingRoute && isAuthenticated && isOnboardingCompleted) {
    const homeUrl = new URL("/home", req.url);
    return NextResponse.redirect(homeUrl);
  }

  // 4. Authenticated users visiting /auth or /auth/verify -> redirect to appropriate screen
  if (isAuthRoute && isAuthenticated) {
    if (isOnboardingCompleted) {
      return NextResponse.redirect(new URL("/home", req.url));
    } else {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, logo.jpeg, images, css, js
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
