import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listCustomersAdmin, updateCustomerStatus, logAdminAuditEvent } from "@/lib/admin-db";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "users:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: users:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const onboarding = searchParams.get("onboarding") || undefined;

    const data = await listCustomersAdmin({ page, limit, search, status, onboarding });

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Admin list customers error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "users:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: users:write required" }, { status: 403 });
    }

    const body = await req.json();
    const { customerId, action, reason } = body;

    if (!customerId || !action) {
      return NextResponse.json({ success: false, error: "customerId and action are required" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (action === "SUSPEND") {
      await updateCustomerStatus(customerId, "SUSPENDED");
      await logAdminAuditEvent({
        eventType: "ADMIN_USER_SUSPENDED",
        adminId: admin.adminId,
        customerId,
        ipAddress: ip,
        metadata: { reason: reason || "Manual administrative suspension" },
      });
      return NextResponse.json({ success: true, message: "User suspended successfully" });
    }

    if (action === "REACTIVATE") {
      await updateCustomerStatus(customerId, "ACTIVE");
      await logAdminAuditEvent({
        eventType: "ADMIN_USER_REACTIVATED",
        adminId: admin.adminId,
        customerId,
        ipAddress: ip,
        metadata: { reason: reason || "Manual administrative reactivation" },
      });
      return NextResponse.json({ success: true, message: "User reactivated successfully" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin user action error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
