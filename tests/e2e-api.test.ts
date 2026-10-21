import { describe, it, expect, beforeEach } from "vitest";
import { POST as sendOtpHandler } from "../src/app/api/auth/send-otp/route";
import { POST as verifyOtpHandler } from "../src/app/api/auth/verify-otp/route";
import { POST as onboardingHandler } from "../src/app/api/customer/onboarding/route";
import { inMemoryDb } from "../src/lib/supabase/db";
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "../src/lib/session";

describe("End-to-End API Flow (Send OTP -> Verify -> Onboarding)", () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  it("completes full user lifecycle with sequential customer ID allocation", async () => {
    const testPhone = "9876543210";

    // Step 1: Send OTP
    const sendReq = new NextRequest("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone }),
    });

    const sendRes = await sendOtpHandler(sendReq);
    expect(sendRes.status).toBe(200);
    const sendData = await sendRes.json();
    expect(sendData.success).toBe(true);
    expect(sendData.maskedPhone).toBe("+91 98*** ***10");

    const otpCode = sendData.devMockOtp;
    expect(otpCode).toBeDefined();

    // Step 2: Verify OTP
    const verifyReq = new NextRequest("http://localhost:3000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, otp: otpCode }),
    });

    const verifyRes = await verifyOtpHandler(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.customer.customerId).toBe("GH000001");
    expect(verifyData.customer.onboardingCompleted).toBe(false);
    expect(verifyData.nextStep).toBe("/onboarding");

    // Extract session cookie from verify response
    const setCookieHeader = verifyRes.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain(SESSION_COOKIE_NAME);

    // Extract cookie value for subsequent authenticated requests
    const cookieMatch = setCookieHeader?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    const sessionToken = cookieMatch ? cookieMatch[1] : "";
    expect(sessionToken).toBeTruthy();

    // Step 3: Complete Onboarding
    const onboardingReq = new NextRequest("http://localhost:3000/api/customer/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
      },
      body: JSON.stringify({
        fullName: "Aarav Patel",
        city: "Bangalore",
        displayName: "Aarav",
      }),
    });

    const onboardingRes = await onboardingHandler(onboardingReq);
    expect(onboardingRes.status).toBe(200);
    const onboardingData = await onboardingRes.json();
    expect(onboardingData.success).toBe(true);
    expect(onboardingData.customer.fullName).toBe("Aarav Patel");
    expect(onboardingData.customer.city).toBe("Bangalore");
    expect(onboardingData.customer.onboardingCompleted).toBe(true);
    expect(onboardingData.customer.customerId).toBe("GH000001");
    expect(onboardingData.nextStep).toBe("/home");
  });
});
