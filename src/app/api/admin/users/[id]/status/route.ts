import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { toggleCustomerStatusAdmin } from "@/lib/admin-db";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "users:write")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions to modify user status" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    await toggleCustomerStatusAdmin(id, parsed.data.status, admin.adminId);
    return NextResponse.json({
      success: true,
      status: parsed.data.status,
      message: `Account status updated to ${parsed.data.status}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update account status" }, { status: 500 });
  }
}
