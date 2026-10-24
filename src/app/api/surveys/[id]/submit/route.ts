import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { submitSurveyCompletion } from "@/lib/survey-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await req.json();
    const { attemptId, answers } = body;

    if (!attemptId) {
      return NextResponse.json({ success: false, error: "attemptId is required." }, { status: 400 });
    }

    const result = await submitSurveyCompletion(attemptId, session.customerId, answers || {});

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Submission failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      coinsAwarded: result.coinsAwarded,
      status: result.status,
      message: result.message,
    });
  } catch (err: any) {
    console.error("[API /api/surveys/[id]/submit error]", err);
    return NextResponse.json({ success: false, error: "Failed to submit survey." }, { status: 500 });
  }
}
