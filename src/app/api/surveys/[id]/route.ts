import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { getSurveyForTaking } from "@/lib/survey-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyRequestSession(req);
    const customerId = session?.customerId || "";

    const { id } = await params;
    const data = await getSurveyForTaking(id, customerId);

    if (!data) {
      return NextResponse.json({ success: false, error: "Survey not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...data, isAuthenticated: Boolean(session) });
  } catch (err: any) {
    console.error("[API /api/surveys/[id] error]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch survey." }, { status: 500 });
  }
}
