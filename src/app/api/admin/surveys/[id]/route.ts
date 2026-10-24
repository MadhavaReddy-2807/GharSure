import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import {
  getSurveyByIdAdmin,
  updateSurveyStatusAdmin,
  updateSurveyDetailsAdmin,
  saveSurveyQuestionsAdmin,
  logAdminAuditEvent,
} from "@/lib/admin-db";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["TESTING", "PUBLISHED", "ARCHIVED"],
  TESTING: ["APPROVED", "PUBLISHED", "DRAFT", "ARCHIVED"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "DRAFT"],
  SCHEDULED: ["PUBLISHED", "APPROVED", "DRAFT"],
  PUBLISHED: ["PAUSED", "CLOSED", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "CLOSED", "ARCHIVED"],
  CLOSED: ["ARCHIVED", "PUBLISHED"],
  ARCHIVED: [],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "surveys:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: surveys:read required" }, { status: 403 });
    }

    const { id } = await params;
    const survey = await getSurveyByIdAdmin(id);

    if (!survey) {
      return NextResponse.json({ success: false, error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, survey });
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
    if (!admin || !hasAdminPermission(admin.role, "surveys:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: surveys:write required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, questions, details } = body;

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (details) {
      const updated = await updateSurveyDetailsAdmin(id, details);
      await logAdminAuditEvent({
        eventType: "ADMIN_SURVEY_DETAILS_UPDATED",
        adminId: admin.adminId,
        ipAddress: ip,
        metadata: { surveyId: id, details },
      });
      return NextResponse.json({ success: true, survey: updated });
    }

    if (status) {
      if (status === "PUBLISHED" && !hasAdminPermission(admin.role, "surveys:publish")) {
        return NextResponse.json(
          { success: false, error: "Forbidden: surveys:publish required to publish surveys" },
          { status: 403 }
        );
      }

      const current = await getSurveyByIdAdmin(id);
      if (!current) {
        return NextResponse.json({ success: false, error: "Survey not found" }, { status: 404 });
      }

      // Check transition validity
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid state transition from ${current.status} to ${status}` },
          { status: 400 }
        );
      }

      const updated = await updateSurveyStatusAdmin(id, status, admin.adminId);
      await logAdminAuditEvent({
        eventType: "ADMIN_SURVEY_STATUS_CHANGED",
        adminId: admin.adminId,
        ipAddress: ip,
        metadata: { surveyId: id, previousStatus: current.status, newStatus: status },
      });

      return NextResponse.json({ success: true, survey: updated });
    }

    if (questions && Array.isArray(questions)) {
      await saveSurveyQuestionsAdmin(id, questions);
      await logAdminAuditEvent({
        eventType: "ADMIN_SURVEY_QUESTIONS_SAVED",
        adminId: admin.adminId,
        ipAddress: ip,
        metadata: { surveyId: id, questionsCount: questions.length },
      });
      return NextResponse.json({ success: true, message: "Questions updated successfully" });
    }

    return NextResponse.json({ success: false, error: "No valid action provided" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
