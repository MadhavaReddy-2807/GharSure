import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import { listAvailableFileActivities, listAvailableQuickPolls } from "@/lib/rewards-activities-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const customerId = session?.customerId;

    const [surveys, fileActivities, quickPolls] = await Promise.all([
      customerId ? listAvailableSurveysForCustomer(customerId).catch(() => []) : [],
      listAvailableFileActivities(customerId).catch(() => []),
      listAvailableQuickPolls(customerId).catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      surveys,
      fileActivities,
      quickPolls,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load rewards activities" },
      { status: 500 }
    );
  }
}
