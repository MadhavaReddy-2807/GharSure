import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { saveSurveyAutosave } from "@/lib/survey-db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await req.json();
    const { attemptId, answers, currentQuestionId, questionPath } = body;

    if (!attemptId) {
      return NextResponse.json({ success: false, error: "attemptId is required." }, { status: 400 });
    }

    const result = await saveSurveyAutosave(
      attemptId,
      session.customerId,
      answers || {},
      currentQuestionId,
      questionPath
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Failed to save." }, { status: 400 });
    }

    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("[API /api/surveys/[id]/save error]", err);
    return NextResponse.json({ success: false, error: "Failed to autosave survey progress." }, { status: 500 });
  }
}
