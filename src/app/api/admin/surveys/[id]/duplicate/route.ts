import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { duplicateSurveyAdmin, logAdminAuditEvent } from "@/lib/admin-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "surveys:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: surveys:write required" }, { status: 403 });
    }

    const { id } = await params;
    const duplicated = await duplicateSurveyAdmin(id, admin.adminId);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_SURVEY_DUPLICATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { originalSurveyId: id, newSurveyId: duplicated.survey_id },
    });

    return NextResponse.json({ success: true, survey: duplicated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
