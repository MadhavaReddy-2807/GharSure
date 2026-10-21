import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/phone";
import { verifyOtpChallenge, getOrCreateCustomer, logAuditEvent } from "@/lib/supabase/db";
import { signSession, setSessionCookie } from "@/lib/session";

const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  otp: z.string().min(4, "OTP code is required").max(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const phoneE164 = normalizeIndianPhone(parsed.data.phone);
    if (!phoneE164) {
      return NextResponse.json(
        { success: false, error: "Invalid mobile number format." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Verify OTP challenge
    const verification = await verifyOtpChallenge({
      phoneE164,
      candidateOtp: parsed.data.otp.trim(),
    });

    if (!verification.success) {
      await logAuditEvent("OTP_VERIFICATION_FAILED", phoneE164, undefined, ip, {
        reason: verification.errorCode,
      });

      const statusCode = verification.errorCode === "MAX_ATTEMPTS_EXCEEDED" ? 429 : 400;
      return NextResponse.json(
        {
          success: false,
          error: verification.error || "Invalid OTP code.",
          errorCode: verification.errorCode,
        },
        { status: statusCode }
      );
    }

    // OTP is valid! Retrieve or atomically create customer with sequential customer_id (e.g. GH000001)
    const customer = await getOrCreateCustomer(phoneE164);

    // Sign trusted JWT session token
    const token = await signSession({
      customerId: customer.id,
      readableId: customer.customer_id,
      phone: customer.phone_e164,
      onboardingCompleted: customer.onboarding_completed,
    });

    await logAuditEvent("CUSTOMER_AUTHENTICATED", phoneE164, customer.id, ip, {
      customerId: customer.customer_id,
      isNewCustomer: !customer.full_name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful.",
      customer: {
        id: customer.id,
        customerId: customer.customer_id,
        phone: customer.phone_e164,
        fullName: customer.full_name,
        city: customer.city,
        displayName: customer.display_name,
        onboardingCompleted: customer.onboarding_completed,
      },
      nextStep: customer.onboarding_completed ? "/home" : "/onboarding",
    });

    // Set secure HTTP-only session cookie
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("[API verify-otp error]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
