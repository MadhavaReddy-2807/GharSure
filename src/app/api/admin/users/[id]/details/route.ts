import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { getCustomerDetailedProfileAdmin } from "@/lib/admin-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "users:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const profile = await getCustomerDetailedProfileAdmin(id);
    if (!profile || !profile.customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load customer profile" }, { status: 500 });
  }
}
