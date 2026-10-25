import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { startOrResumeSurveyAttempt } from "@/lib/survey-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const result = await startOrResumeSurveyAttempt(id, session.customerId);

    if (result.error) {
      const status =
        result.error.toLowerCase().includes("sign in") ||
        result.error.toLowerCase().includes("unauthorized")
          ? 401
          : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[API /api/surveys/[id]/start error]", err);
    return NextResponse.json({ success: false, error: "Failed to start survey attempt." }, { status: 500 });
  }
}
