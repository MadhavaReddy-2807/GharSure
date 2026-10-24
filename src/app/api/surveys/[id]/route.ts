import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { getSurveyForTaking } from "@/lib/survey-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const data = await getSurveyForTaking(id, session.customerId);

    if (!data) {
      return NextResponse.json({ success: false, error: "Survey not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("[API /api/surveys/[id] error]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch survey." }, { status: 500 });
  }
}
