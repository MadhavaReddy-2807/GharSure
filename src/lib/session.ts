import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "gharsure_session";
const SESSION_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  customerId: string; // Database UUID (sub)
  readableId: string; // Sequential ID, e.g. GH000001
  phone: string;      // +91XXXXXXXXXX
  onboardingCompleted: boolean;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET || "gharsure-development-super-secure-jwt-signing-key-32-chars-minimum";
  return new TextEncoder().encode(secret);
}

/**
 * Sign a session JWT token
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const key = getSecretKey();
  return await new SignJWT({
    sub: payload.customerId,
    readableId: payload.readableId,
    phone: payload.phone,
    onboardingCompleted: payload.onboardingCompleted,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_SECONDS}s`)
    .sign(key);
}

/**
 * Verify a session JWT token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || !payload.readableId || !payload.phone) {
      return null;
    }

    return {
      customerId: payload.sub as string,
      readableId: payload.readableId as string,
      phone: payload.phone as string,
      onboardingCompleted: Boolean(payload.onboardingCompleted),
    };
  } catch {
    return null;
  }
}

/**
 * Get current session from Next.js cookies (Server Components & Server Actions)
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

/**
 * Verify session from a NextRequest (Middleware or Route Handler)
 */
export async function verifyRequestSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

/**
 * Attach session cookie to NextResponse
 */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

/**
 * Clear session cookie on NextResponse (Logout)
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
