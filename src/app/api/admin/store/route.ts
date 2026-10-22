import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listTrialsAdmin, saveTrialAdmin, logAdminAuditEvent } from "@/lib/admin-db";
import { z } from "zod";

const trialSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  description: z.string().default(""),
  productId: z.string().uuid().nullable().optional(),
  coinCost: z.number().int().min(0).default(0),
  inventoryStock: z.number().int().min(0).default(100),
  status: z.enum(["ACTIVE", "PAUSED", "EXHAUSTED", "CLOSED"]).default("ACTIVE"),
  partnerName: z.string().optional(),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "store:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: store:read required" }, { status: 403 });
    }

    const trials = await listTrialsAdmin();
    return NextResponse.json({ success: true, trials });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "store:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: store:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = trialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const trial = await saveTrialAdmin(parsed.data);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: parsed.data.id ? "ADMIN_TRIAL_CAMPAIGN_UPDATED" : "ADMIN_TRIAL_CAMPAIGN_CREATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { trialId: trial.id, title: trial.title, status: trial.status },
    });

    return NextResponse.json({ success: true, trial });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
