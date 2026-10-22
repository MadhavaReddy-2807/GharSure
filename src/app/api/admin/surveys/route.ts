import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listSurveysAdmin, createSurveyAdmin, logAdminAuditEvent } from "@/lib/admin-db";
import { z } from "zod";

const createSurveySchema = z.object({
  surveyId: z.string().min(3).max(50),
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  category: z.string().default("Water Quality"),
  estimatedDurationMin: z.number().int().min(1).max(60).default(5),
  internalObjective: z.string().optional(),
  sponsorDetails: z.string().optional(),
  rewardCoins: z.number().int().min(0).max(1000).default(50),
  responseQuota: z.number().int().min(10).max(100000).default(500),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "surveys:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: surveys:read required" }, { status: 403 });
    }

    const surveys = await listSurveysAdmin();
    return NextResponse.json({ success: true, surveys });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "surveys:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: surveys:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSurveySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const newSurvey = await createSurveyAdmin({
      ...parsed.data,
      adminId: admin.adminId,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_SURVEY_CREATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { surveyId: newSurvey.survey_id, title: newSurvey.title },
    });

    return NextResponse.json({ success: true, survey: newSurvey });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
