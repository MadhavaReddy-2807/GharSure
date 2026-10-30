import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { strikeOffProductAdmin } from "@/lib/admin-db";
import { z } from "zod";

const strikeOffSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  reason: z.string().min(3, "Please provide a reason for striking off this listing"),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "store:strike_off") && !hasAdminPermission(admin.role, "store:write")) {
      return NextResponse.json({ error: "Insufficient permissions to strike off listings" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = strikeOffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const updated = await strikeOffProductAdmin(parsed.data.productId, parsed.data.reason, admin.adminId);
    return NextResponse.json({
      success: true,
      product: updated,
      message: "Listing successfully struck off and archived from the public catalog.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to strike off product" }, { status: 500 });
  }
}
