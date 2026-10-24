import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const surveys = await listAvailableSurveysForCustomer(session.customerId);
    return NextResponse.json({ success: true, surveys });
  } catch (err: any) {
    console.error("[API /api/surveys error]", err);
    return NextResponse.json({ success: false, error: "Failed to load surveys." }, { status: 500 });
  }
}
