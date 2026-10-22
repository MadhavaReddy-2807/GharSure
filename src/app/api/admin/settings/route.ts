import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { getSystemSettingsAdmin, updateSystemSettingAdmin, logAdminAuditEvent } from "@/lib/admin-db";

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "settings:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: settings:read required" }, { status: 403 });
    }

    const settings = await getSystemSettingsAdmin();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "settings:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: settings:write required" }, { status: 403 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "key and value are required" }, { status: 400 });
    }

    await updateSystemSettingAdmin(key, value, admin.adminId);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_SYSTEM_SETTING_UPDATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { settingKey: key, updatedValue: value },
    });

    return NextResponse.json({ success: true, message: "Setting updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
