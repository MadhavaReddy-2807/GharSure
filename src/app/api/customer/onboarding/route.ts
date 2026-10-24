import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestSession, signSession, setSessionCookie } from "@/lib/session";
import { updateCustomerProfile, logAuditEvent } from "@/lib/supabase/db";
import { processReferralOnboarding } from "@/lib/referral";

const onboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  city: z
    .string()
    .refine((val) => val === undefined || val === "" || val.trim().length >= 2, {
      message: "City name must be at least 2 characters",
    })
    .optional()
    .or(z.literal("")),
  displayName: z
    .string()
    .trim()
    .max(50, "Display name cannot exceed 50 characters")
    .optional()
    .or(z.literal("")),
  referralCode: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid form data.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, city, displayName, referralCode } = parsed.data;

    const trimmedCity = city && city.trim().length > 0 ? city.trim() : null;
    const cleanReferralCode = referralCode && referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : undefined;

    // Process referral code attribution and rewards if provided
    let referralAttributionId: string | undefined;
    if (cleanReferralCode) {
      const referralResult = await processReferralOnboarding(session.customerId, cleanReferralCode);
      if (!referralResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: referralResult.error || "Invalid referral code.",
            fieldErrors: { referralCode: [referralResult.error || "Invalid referral code."] },
          },
          { status: 400 }
        );
      }
      referralAttributionId = referralResult.attributionId;
    }

    // Update customer in database
    const updatedCustomer = await updateCustomerProfile(session.customerId, {
      fullName,
      city: trimmedCity,
      displayName: displayName || null,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent("ONBOARDING_COMPLETED", session.phone, session.customerId, ip, {
      city: trimmedCity,
      referralCode: cleanReferralCode || null,
      referralAttributionId: referralAttributionId || null,
    });

    // Refresh session token with onboardingCompleted = true
    const updatedToken = await signSession({
      customerId: updatedCustomer.id,
      readableId: updatedCustomer.customer_id,
      phone: updatedCustomer.phone_e164,
      onboardingCompleted: true,
    });

    const response = NextResponse.json({
      success: true,
      message: "Onboarding completed successfully.",
      customer: {
        id: updatedCustomer.id,
        customerId: updatedCustomer.customer_id,
        phone: updatedCustomer.phone_e164,
        fullName: updatedCustomer.full_name,
        city: updatedCustomer.city,
        displayName: updatedCustomer.display_name,
        onboardingCompleted: true,
      },
      nextStep: "/home",
    });

    setSessionCookie(response, updatedToken);
    return response;
  } catch (error) {
    console.error("[API onboarding error]", error);
    return NextResponse.json(
      { success: false, error: "Failed to save profile. Please try again." },
      { status: 500 }
    );
  }
}
