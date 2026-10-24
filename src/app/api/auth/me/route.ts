import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);

    if (!session) {
      return NextResponse.json(
        { authenticated: false, customer: null },
        { status: 401 }
      );
    }

    const customer = await getCustomerById(session.customerId);

    if (!customer) {
      return NextResponse.json(
        { authenticated: false, customer: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        customerId: customer.customer_id,
        phone: customer.phone_e164,
        fullName: customer.full_name,
        city: customer.city,
        displayName: customer.display_name,
        referralCode: customer.referral_code,
        rewardCoins: customer.reward_coins ?? 100,
        onboardingCompleted: customer.onboarding_completed,
      },
    });
  } catch (error) {
    console.error("[API auth/me error]", error);
    return NextResponse.json(
      { authenticated: false, error: "Failed to fetch session." },
      { status: 500 }
    );
  }
}
