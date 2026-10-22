import { NextResponse } from "next/server";
import { getCurrentAdminSession, ROLE_PERMISSIONS } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const permissions = ROLE_PERMISSIONS[admin.role] || [];

    return NextResponse.json({
      success: true,
      admin: {
        adminId: admin.adminId,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
