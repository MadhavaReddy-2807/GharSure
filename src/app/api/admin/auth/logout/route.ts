import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, clearAdminSessionCookie } from "@/lib/admin-auth";
import { logAdminAuditEvent } from "@/lib/admin-db";

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (admin) {
      await logAdminAuditEvent({
        eventType: "ADMIN_LOGOUT",
        adminId: admin.adminId,
        ipAddress: ip,
      });
    }

    const res = NextResponse.json({ success: true, message: "Logged out successfully" });
    clearAdminSessionCookie(res);
    return res;
  } catch (err: any) {
    const res = NextResponse.json({ success: true });
    clearAdminSessionCookie(res);
    return res;
  }
}
