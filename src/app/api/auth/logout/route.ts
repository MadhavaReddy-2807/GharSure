import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, verifyRequestSession } from "@/lib/session";
import { logAuditEvent } from "@/lib/supabase/db";

export async function POST(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (session) {
      await logAuditEvent("CUSTOMER_LOGOUT", session.phone, session.customerId, ip);
    }

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out.",
    });

    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("[API logout error]", error);
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  }
}
