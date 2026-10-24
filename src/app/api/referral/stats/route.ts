import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { getCustomerReferralStats } from "@/lib/referral";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const stats = await getCustomerReferralStats(session.customerId);
    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("[API referral/stats error]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch referral statistics." },
      { status: 500 }
    );
  }
}
