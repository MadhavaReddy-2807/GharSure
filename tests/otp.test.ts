import { describe, it, expect } from "vitest";
import { generateOtp, hashOtp, verifyOtpHash } from "../src/lib/otp";

describe("Cryptographic OTP Utilities", () => {
  it("generates 6-digit numeric OTPs", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtp(6);
      expect(code).toMatch(/^\d{6}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("hashes OTP with salt and verifies matches correctly", () => {
    const otp = "849201";
    const salt = "+919876543210";
    const hash = hashOtp(otp, salt);

    expect(hash).toHaveLength(64); // SHA-256 hex is 64 characters
    expect(verifyOtpHash("849201", hash, salt)).toBe(true);
    expect(verifyOtpHash("849202", hash, salt)).toBe(false);
    expect(verifyOtpHash("123456", hash, salt)).toBe(false);
  });

  it("produces different hashes for different phone salts even with same OTP", () => {
    const otp = "123456";
    const hash1 = hashOtp(otp, "+919876543210");
    const hash2 = hashOtp(otp, "+919876543211");

    expect(hash1).not.toBe(hash2);
    expect(verifyOtpHash(otp, hash1, "+919876543211")).toBe(false);
  });
});
