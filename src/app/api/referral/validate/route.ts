import { NextRequest, NextResponse } from "next/server";
import { validateReferralCode } from "@/lib/referral";
import { verifyRequestSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code || !code.trim()) {
      return NextResponse.json(
        { valid: false, error: "Referral code is required." },
        { status: 400 }
      );
    }

    const session = await verifyRequestSession(req);
    const result = await validateReferralCode(code.trim(), session?.customerId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API referral/validate error]", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate referral code." },
      { status: 500 }
    );
  }
}
