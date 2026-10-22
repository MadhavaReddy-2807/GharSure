import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { getCustomerDetailAdmin, updateCustomerAdminFields, logAdminAuditEvent } from "@/lib/admin-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "users:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: users:read required" }, { status: 403 });
    }

    const { id } = await params;
    const customer = await getCustomerDetailAdmin(id);

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "users:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: users:write required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { fullName, city, supportNotes } = body;

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    await updateCustomerAdminFields(id, { fullName, city, supportNotes });

    await logAdminAuditEvent({
      eventType: "ADMIN_USER_UPDATED",
      adminId: admin.adminId,
      customerId: id,
      ipAddress: ip,
      metadata: { fieldsUpdated: { fullName: Boolean(fullName), city: Boolean(city), supportNotes: Boolean(supportNotes) } },
    });

    return NextResponse.json({ success: true, message: "Customer updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
