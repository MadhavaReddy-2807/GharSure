import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listCoinLedgerAdmin, executeManualCoinAdjustment, logAdminAuditEvent } from "@/lib/admin-db";
import { z } from "zod";

const adjustmentSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().int().refine((val) => val !== 0, "Adjustment amount cannot be zero"),
  reasonCode: z.enum([
    "SUPPORT_GOODWILL",
    "SURVEY_RECONCILIATION",
    "REFERRAL_CORRECTION",
    "PROMOTIONAL_BONUS",
    "FRAUD_PENALTY_REVERSAL",
  ]),
  description: z.string().min(5).max(255),
  idempotencyKey: z.string().min(8).max(128),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "rewards:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: rewards:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const customerId = searchParams.get("customerId") || undefined;

    const data = await listCoinLedgerAdmin({ limit, offset, customerId });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "rewards:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: rewards:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const tx = await executeManualCoinAdjustment({
      ...parsed.data,
      adminId: admin.adminId,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_COIN_ADJUSTMENT",
      adminId: admin.adminId,
      customerId: parsed.data.customerId,
      ipAddress: ip,
      metadata: {
        amount: parsed.data.amount,
        reasonCode: parsed.data.reasonCode,
        idempotencyKey: parsed.data.idempotencyKey,
      },
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
