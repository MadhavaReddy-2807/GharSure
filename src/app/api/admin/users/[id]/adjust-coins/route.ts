import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { adjustCustomerCoinsAdmin } from "@/lib/admin-db";
import { z } from "zod";

const adjustSchema = z.object({
  amount: z.number().int().refine((val) => val !== 0, "Adjustment amount cannot be zero"),
  reason: z.string().min(5, "Please provide an audited explanation for this balance adjustment"),
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

    if (!hasAdminPermission(admin.role, "rewards:write") && !hasAdminPermission(admin.role, "access:manage")) {
      return NextResponse.json({ error: "Forbidden: Only authorized administrators may adjust balances" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const result = await adjustCustomerCoinsAdmin({
      customerId: id,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      adminId: admin.adminId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Adjustment failed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      message: `Successfully adjusted balance by ${parsed.data.amount > 0 ? "+" : ""}${parsed.data.amount} coins.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to adjust coins" }, { status: 500 });
  }
}
