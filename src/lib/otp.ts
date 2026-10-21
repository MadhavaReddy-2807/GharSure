import crypto from "crypto";

/**
 * Generate a cryptographically secure numeric OTP of the specified length (default 6 digits)
 */
export function generateOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString();
}

/**
 * Hash an OTP using SHA-256 with phone number as salt
 */
export function hashOtp(otp: string, salt: string): string {
  return crypto
    .createHmac("sha256", process.env.AUTH_SESSION_SECRET || "gharsure-otp-default-pepper")
    .update(`${salt}:${otp.trim()}`)
    .digest("hex");
}

/**
 * Verify an OTP against a stored hash in constant time
 */
export function verifyOtpHash(candidateOtp: string, storedHash: string, salt: string): boolean {
  if (!candidateOtp || !storedHash) return false;

  const candidateHash = hashOtp(candidateOtp, salt);
  
  if (candidateHash.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(candidateHash, "utf-8"),
    Buffer.from(storedHash, "utf-8")
  );
}
