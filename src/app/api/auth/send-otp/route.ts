import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIndianPhone, maskPhone } from "@/lib/phone";
import { generateOtp, hashOtp } from "@/lib/otp";
import { createOtpChallenge, logAuditEvent } from "@/lib/supabase/db";
import { sendWhatsAppOtp } from "@/lib/meta-whatsapp";
import { getEnv } from "@/lib/env";

const sendOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const phoneE164 = normalizeIndianPhone(parsed.data.phone);
    if (!phoneE164) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).",
        },
        { status: 400 }
      );
    }

    const env = getEnv();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Determine OTP code: In mock mode if OTP_DEV_MOCK_CODE is configured, use it, else generate secure 6 digits
    const otp = (env.OTP_DEV_MOCK_ENABLED && env.OTP_DEV_MOCK_CODE)
      ? env.OTP_DEV_MOCK_CODE
      : generateOtp(6);

    const otpHash = hashOtp(otp, phoneE164);

    // Save challenge in DB with cooldown & rate limit enforcement
    const challengeResult = await createOtpChallenge({
      phoneE164,
      otpHash,
      ipAddress: ip,
    });

    if (!challengeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: challengeResult.error || "Unable to send OTP at this time.",
          retryAfterSeconds: challengeResult.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Deliver via Meta WhatsApp Cloud API
    const deliveryResult = await sendWhatsAppOtp({
      toPhoneE164: phoneE164,
      otp,
    });

    if (!deliveryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deliveryResult.error || "Failed to deliver WhatsApp OTP. Please retry.",
          errorCode: deliveryResult.errorCode,
        },
        { status: 502 }
      );
    }

    // Log security audit
    await logAuditEvent("OTP_SENT", phoneE164, undefined, ip, {
      messageId: deliveryResult.messageId,
      isMock: deliveryResult.isMock || false,
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp verification code sent successfully.",
      maskedPhone: maskPhone(phoneE164),
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      // Provide devMockOtp ONLY when dev mock mode is explicitly enabled for convenient local verification
      ...(env.OTP_DEV_MOCK_ENABLED ? { devMockOtp: otp } : {}),
    });
  } catch (error) {
    console.error("[API send-otp error]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
