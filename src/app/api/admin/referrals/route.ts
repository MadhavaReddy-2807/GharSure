import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listReferralsAdmin, updateReferralStatusAdmin, logAdminAuditEvent } from "@/lib/admin-db";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "referrals:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: referrals:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const referrals = await listReferralsAdmin({ status, search });
    return NextResponse.json({ success: true, referrals });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "referrals:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: referrals:write required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, rejectionReason } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "id and status are required" }, { status: 400 });
    }

    const updated = await updateReferralStatusAdmin(id, status, rejectionReason, admin.adminId);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_REFERRAL_STATUS_UPDATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { referralId: id, status, rejectionReason },
    });

    return NextResponse.json({ success: true, referral: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
