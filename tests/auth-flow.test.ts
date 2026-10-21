import { describe, it, expect, beforeEach } from "vitest";
import { inMemoryDb, createOtpChallenge, verifyOtpChallenge } from "../src/lib/supabase/db";
import { hashOtp } from "../src/lib/otp";
import { signSession, verifySession } from "../src/lib/session";

describe("WhatsApp OTP Verification Flow & Security Controls", () => {
  const phone = "+919876543210";
  const validOtp = "654321";

  beforeEach(() => {
    inMemoryDb.reset();
  });

  it("successfully creates and verifies an OTP challenge", async () => {
    const hash = hashOtp(validOtp, phone);
    const challenge = await createOtpChallenge({
      phoneE164: phone,
      otpHash: hash,
      ipAddress: "127.0.0.1",
    });

    expect(challenge.success).toBe(true);

    const verification = await verifyOtpChallenge({
      phoneE164: phone,
      candidateOtp: validOtp,
    });

    expect(verification.success).toBe(true);
  });

  it("enforces resend cooldown between OTP requests", async () => {
    const hash = hashOtp(validOtp, phone);

    // First request
    const first = await createOtpChallenge({
      phoneE164: phone,
      otpHash: hash,
    });
    expect(first.success).toBe(true);

    // Immediate second request must be rejected with cooldown error
    const second = await createOtpChallenge({
      phoneE164: phone,
      otpHash: hash,
    });

    expect(second.success).toBe(false);
    expect(second.error).toContain("Please wait");
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("rejects incorrect OTPs and decrements remaining attempts", async () => {
    const hash = hashOtp(validOtp, phone);
    await createOtpChallenge({
      phoneE164: phone,
      otpHash: hash,
    });

    const res1 = await verifyOtpChallenge({
      phoneE164: phone,
      candidateOtp: "000000",
    });

    expect(res1.success).toBe(false);
    expect(res1.errorCode).toBe("INVALID_CODE");
    expect(res1.error).toContain("4 attempt(s) remaining");
  });

  it("locks challenge after maximum failed attempts (5)", async () => {
    const hash = hashOtp(validOtp, phone);
    await createOtpChallenge({
      phoneE164: phone,
      otpHash: hash,
    });

    // Make 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await verifyOtpChallenge({
        phoneE164: phone,
        candidateOtp: "111111",
      });
    }

    // 6th attempt should return MAX_ATTEMPTS_EXCEEDED even if code is correct!
    const sixth = await verifyOtpChallenge({
      phoneE164: phone,
      candidateOtp: validOtp,
    });

    expect(sixth.success).toBe(false);
    expect(sixth.errorCode).toBe("MAX_ATTEMPTS_EXCEEDED");
  });

  it("prevents OTP replay reuse after successful verification", async () => {
    const hash = hashOtp(validOtp, phone);
    await createOtpChallenge({
      phoneE164: phone,
      otpHash: hash,
    });

    const firstVerify = await verifyOtpChallenge({
      phoneE164: phone,
      candidateOtp: validOtp,
    });
    expect(firstVerify.success).toBe(true);

    // Replay attempt with same code
    const replayVerify = await verifyOtpChallenge({
      phoneE164: phone,
      candidateOtp: validOtp,
    });
    expect(replayVerify.success).toBe(false);
  });

  it("creates and verifies cryptographically signed session tokens", async () => {
    const payload = {
      customerId: "uuid-123-abc",
      readableId: "GH000001",
      phone: "+919876543210",
      onboardingCompleted: false,
    };

    const token = await signSession(payload);
    expect(token).toBeDefined();

    const decoded = await verifySession(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.customerId).toBe("uuid-123-abc");
    expect(decoded?.readableId).toBe("GH000001");
    expect(decoded?.phone).toBe("+919876543210");
    expect(decoded?.onboardingCompleted).toBe(false);
  });
});
