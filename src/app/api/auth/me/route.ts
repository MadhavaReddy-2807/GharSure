import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession, signSession, setSessionCookie, clearSessionCookie } from "@/lib/session";
import { getCustomerById, getCustomerByPhone } from "@/lib/supabase/db";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);

    if (!session) {
      return NextResponse.json(
        { authenticated: false, customer: null },
        { status: 401 }
      );
    }

    let customer = await getCustomerById(session.customerId);

    // Fallback: if session customerId does not exist (e.g. from previous environment), lookup by verified phone
    let sessionNeedsUpdate = false;
    if (!customer && session.phone) {
      customer = await getCustomerByPhone(session.phone);
      if (customer) {
        sessionNeedsUpdate = true;
      }
    }

    if (!customer) {
      const resp = NextResponse.json(
        { authenticated: false, customer: null },
        { status: 401 }
      );
      clearSessionCookie(resp);
      return resp;
    }

    const response = NextResponse.json({
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

    if (sessionNeedsUpdate) {
      const newToken = await signSession({
        customerId: customer.id,
        readableId: customer.customer_id,
        phone: customer.phone_e164,
        onboardingCompleted: customer.onboarding_completed,
      });
      setSessionCookie(response, newToken);
    }

    return response;
  } catch (error) {
    console.error("[API auth/me error]", error);
    return NextResponse.json(
      { authenticated: false, error: "Failed to fetch session." },
      { status: 500 }
    );
  }
}
