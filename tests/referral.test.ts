import { describe, it, expect, beforeEach } from "vitest";
import {
  generateRandomReferralCode,
  generateUniqueReferralCode,
  validateReferralCode,
  processReferralOnboarding,
  getCustomerReferralStats,
  executeReferralReward,
} from "../src/lib/referral";
import { inMemoryDb, getOrCreateCustomer, updateCustomerProfile } from "../src/lib/supabase/db";

describe("Referral System Core Functionality", () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  describe("Referral Code Generation", () => {
    it("generates a code starting with GS and exactly 8 characters", () => {
      const code = generateRandomReferralCode();
      expect(code).toMatch(/^GS[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      expect(code.length).toBe(8);
    });

    it("generates unique codes with high entropy without collisions", async () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const code = await generateUniqueReferralCode();
        expect(set.has(code)).toBe(false);
        set.add(code);
      }
      expect(set.size).toBe(50);
    });
  });

  describe("Referral Code Validation", () => {
    it("validates an active customer's referral code correctly", async () => {
      const referrer = await getOrCreateCustomer("+919876543210");
      await updateCustomerProfile(referrer.id, {
        fullName: "Vikram Malhotra",
        city: "Bangalore",
      });

      const refCode = referrer.referral_code;
      expect(refCode).toBeDefined();

      const validation = await validateReferralCode(refCode!);
      expect(validation.valid).toBe(true);
      expect(validation.referrerId).toBe(referrer.id);
      expect(validation.referrerName).toBe("Vikram Malhotra");
      expect(validation.bonusCoins).toBe(100);
    });

    it("is case-insensitive during code validation", async () => {
      const referrer = await getOrCreateCustomer("+919876543210");
      const refCode = referrer.referral_code!;

      const lowercaseValidation = await validateReferralCode(refCode.toLowerCase());
      expect(lowercaseValidation.valid).toBe(true);
      expect(lowercaseValidation.referrerId).toBe(referrer.id);
    });

    it("rejects non-existent referral codes with INVALID_CODE", async () => {
      const validation = await validateReferralCode("GS999999");
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe("INVALID_CODE");
    });

    it("prevents self-referral when candidate matches current customer id", async () => {
      const customer = await getOrCreateCustomer("+919876543210");
      const refCode = customer.referral_code!;

      const validation = await validateReferralCode(refCode, customer.id);
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe("SELF_REFERRAL");
      expect(validation.error).toContain("cannot use your own referral code");
    });
  });

  describe("End-to-End Referral Onboarding and Dual Reward Emission", () => {
    it("atomically attributes referral and awards coins to both referrer and referee", async () => {
      // 1. Create Referrer
      const referrer = await getOrCreateCustomer("+919876543210");
      await updateCustomerProfile(referrer.id, {
        fullName: "Amitabh Kumar",
        city: "Hyderabad",
      });
      const initialReferrerCoins = referrer.reward_coins || 100;

      // 2. Create Referee
      const referee = await getOrCreateCustomer("+919876543211");
      const initialRefereeCoins = referee.reward_coins || 100;

      // 3. Process referral during onboarding
      const result = await processReferralOnboarding(referee.id, referrer.referral_code!);
      expect(result.success).toBe(true);
      expect(result.status).toBe("REWARDED");
      expect(result.rewardIssued).toBe(true);

      // 4. Verify coin balances incremented
      const updatedReferrer = inMemoryDb.getCustomerById(referrer.id);
      const updatedReferee = inMemoryDb.getCustomerById(referee.id);

      expect(updatedReferrer?.reward_coins).toBe(initialReferrerCoins + 100);
      expect(updatedReferee?.reward_coins).toBe(initialRefereeCoins + 100);
    });

    it("is idempotent: re-submitting does not issue duplicate rewards", async () => {
      const referrer = await getOrCreateCustomer("+919876543210");
      const referee = await getOrCreateCustomer("+919876543211");

      // First run
      const result1 = await processReferralOnboarding(referee.id, referrer.referral_code!);
      expect(result1.success).toBe(true);

      const referrerBalanceAfterFirst = inMemoryDb.getCustomerById(referrer.id)?.reward_coins;

      // Re-run with same referee and code
      const result2 = await processReferralOnboarding(referee.id, referrer.referral_code!);
      expect(result2.success).toBe(true);

      const referrerBalanceAfterSecond = inMemoryDb.getCustomerById(referrer.id)?.reward_coins;
      expect(referrerBalanceAfterSecond).toBe(referrerBalanceAfterFirst);
    });
  });

  describe("Customer Referral Stats and Ledger Tracking", () => {
    it("returns correct stats for customer with active attributions", async () => {
      const referrer = await getOrCreateCustomer("+919876543210");
      await updateCustomerProfile(referrer.id, {
        fullName: "Sneha Patel",
        city: "Pune",
      });

      // Initially zero referrals
      const statsInitial = await getCustomerReferralStats(referrer.id);
      expect(statsInitial.totalReferrals).toBe(0);
      expect(statsInitial.rewardedReferrals).toBe(0);
      expect(statsInitial.totalCoinsEarned).toBe(0);
      expect(statsInitial.referralCode).toBe(referrer.referral_code);

      // Two neighbors use referral code
      const neighbor1 = await getOrCreateCustomer("+919876543212");
      await updateCustomerProfile(neighbor1.id, { fullName: "Rohan D." });
      await processReferralOnboarding(neighbor1.id, referrer.referral_code!);

      const neighbor2 = await getOrCreateCustomer("+919876543213");
      await updateCustomerProfile(neighbor2.id, { fullName: "Deepa N." });
      await processReferralOnboarding(neighbor2.id, referrer.referral_code!);

      const statsAfter = await getCustomerReferralStats(referrer.id);
      expect(statsAfter.totalReferrals).toBe(2);
      expect(statsAfter.rewardedReferrals).toBe(2);
      expect(statsAfter.totalCoinsEarned).toBe(200);
      expect(statsAfter.attributions.length).toBe(2);
      expect(statsAfter.attributions[0].refereeName).toBeDefined();
    });
  });
});
