import fs from "fs";
import path from "path";

// Load .env.local so tests connect directly to Supabase Postgres
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { describe, it, expect, beforeAll } from "vitest";
import {
  upsertProductAdmin,
  strikeOffProductAdmin,
  updateProductMerchandisingAdmin,
  upsertFileActivityAdmin,
  listFileSubmissionsAdmin,
  reviewFileSubmissionAdmin,
  upsertQuickPollAdmin,
} from "@/lib/admin-db";
import {
  listAvailableFileActivities,
  submitFileForActivity,
  listAvailableQuickPolls,
  submitQuickPollVote,
} from "@/lib/rewards-activities-db";
import { listAvailableVouchers, unlockVoucherWithCoins } from "@/lib/voucher-db";
import { hasAdminPermission, AdminRole } from "@/lib/admin-auth";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";

describe("Admin-Controlled Platform Integration Suite", () => {
  let testCustomerId: string;
  let testAdminId: string;

  beforeAll(async () => {
    if (isDirectDatabaseConfigured()) {
      const sql = getDirectSql();
      const existingCust = await sql`SELECT id, reward_coins FROM customers LIMIT 1;`;
      if (existingCust && existingCust.length > 0) {
        testCustomerId = existingCust[0].id;
        await sql`UPDATE customers SET reward_coins = 500 WHERE id = ${testCustomerId};`;
      }

      const existingAdmin = await sql`SELECT id FROM admin_users LIMIT 1;`;
      if (existingAdmin && existingAdmin.length > 0) {
        testAdminId = existingAdmin[0].id;
      }
    } else {
      testCustomerId = "test-cust-uuid";
      testAdminId = "test-admin-uuid";
    }
  });

  describe("1. Store & Merchandising Controls + Listing Strike-Off", () => {
    let createdProductId: string;

    it("allows admin to create a new household product", async () => {
      const newProduct = await upsertProductAdmin({
        title: "Test Smart Water Quality Monitor",
        brand: "GharSure Lab",
        category: "Smart Home",
        summary: "Digital inline sensor for Indian residential water diagnostics.",
        priceInr: 1299,
        coinPrice: 0,
        productType: "GHARSURE_PRODUCT",
        inventoryStock: 50,
        status: "PUBLISHED",
        isFeatured: true,
      });

      expect(newProduct).toBeDefined();
      expect(newProduct.id).toBeDefined();
      createdProductId = newProduct.id;
    });

    it("allows admin to toggle Hot Pick and merchandising controls", async () => {
      const updated = await updateProductMerchandisingAdmin(createdProductId, {
        isHotPick: true,
        isRecommended: true,
        isNewArrival: true,
        discountPercent: 15,
      });

      expect(updated).toBeDefined();
      if (isDirectDatabaseConfigured()) {
        const sql = getDirectSql();
        const rows = await sql`SELECT is_hot_pick, is_recommended, discount_percent FROM products WHERE id::text = ${createdProductId};`;
        expect(rows[0].is_hot_pick).toBe(true);
        expect(rows[0].is_recommended).toBe(true);
        expect(Number(rows[0].discount_percent)).toBe(15);
      }
    });

    it("allows admin to safely strike off a listing and exclude it from active catalog", async () => {
      const struckOff = await strikeOffProductAdmin(
        createdProductId,
        "Temporary lab recall for hardware sensor recalibration",
        testAdminId
      );

      expect(struckOff).toBeDefined();
      expect(struckOff.status).toBe("STRUCK_OFF");
      expect(struckOff.strike_off_reason).toContain("recalibration");

      if (isDirectDatabaseConfigured()) {
        const sql = getDirectSql();
        // Check that published store queries exclude STRUCK_OFF items
        const publishedStore = await sql`
          SELECT id FROM products WHERE status = 'PUBLISHED' AND id::text = ${createdProductId};
        `;
        expect(publishedStore.length).toBe(0);

        // Historical record is preserved
        const historical = await sql`
          SELECT id, status, strike_off_reason FROM products WHERE id::text = ${createdProductId};
        `;
        expect(historical.length).toBe(1);
        expect(historical[0].status).toBe("STRUCK_OFF");
      }
    });
  });

  describe("2. Document Upload Activities & Review Flow (TDS / Reports)", () => {
    let activityId: string;
    let submissionId: string;

    it("allows admin to create a file upload activity", async () => {
      const act = await upsertFileActivityAdmin({
        title: "Submit Municipal Water Test Report",
        description: "Upload verified test report from an authorized water diagnostic laboratory.",
        instructions: "Document must clearly display dissolved solids and test date.",
        documentType: "TDS_REPORT",
        coinReward: 75,
        approvalRequired: true,
        status: "PUBLISHED",
        adminId: testAdminId,
      });

      expect(act).toBeDefined();
      expect(act.id).toBeDefined();
      activityId = act.id;
    });

    it("allows user to submit a document", async () => {
      const subResult = await submitFileForActivity({
        activityId,
        customerId: testCustomerId,
        fileName: "lab_report_oct2026.pdf",
        fileUrl: `submissions/${activityId}/test_report.pdf`,
        fileSizeBytes: 204850,
        mimeType: "application/pdf",
      });

      expect(subResult.success).toBe(true);
      expect(subResult.submissionId).toBeDefined();
      submissionId = subResult.submissionId!;
    });

    it("appears in admin review queue with status SUBMITTED", async () => {
      const submissions = await listFileSubmissionsAdmin({ activityId });
      const found = submissions.find((s) => s.id === submissionId);
      expect(found).toBeDefined();
      expect(found?.status).toBe("SUBMITTED");
      expect(found?.activity_coin_reward).toBe(75);
    });

    it("allows reviewer to approve submission and credits coins idempotently", async () => {
      const reviewResult = await reviewFileSubmissionAdmin({
        submissionId,
        adminId: testAdminId,
        decision: "APPROVE",
        reviewerNotes: "Verified parameters and lab seal.",
      });

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.coinsAwarded).toBe(75);

      if (isDirectDatabaseConfigured()) {
        const sql = getDirectSql();
        // Verify submission status is APPROVED
        const subRows = await sql`SELECT status, reward_coins_awarded FROM file_submissions WHERE id::text = ${submissionId};`;
        expect(subRows[0].status).toBe("APPROVED");
        expect(subRows[0].reward_coins_awarded).toBe(75);

        // Verify coin_transactions has record
        const txRows = await sql`
          SELECT * FROM coin_transactions WHERE customer_id = ${testCustomerId} AND idempotency_key = ${`review_file_${submissionId}`};
        `;
        expect(txRows.length).toBe(1);
        expect(txRows[0].amount).toBe(75);
      }
    });

    it("prevents double reward crediting if approval is called again", async () => {
      const repeatedResult = await reviewFileSubmissionAdmin({
        submissionId,
        adminId: testAdminId,
        decision: "APPROVE",
      });

      expect(repeatedResult.success).toBe(false);
      expect(repeatedResult.error).toContain("already been approved");
    });
  });

  describe("3. Quick Polls Administration & Participation", () => {
    let pollId: string;
    let option1Id: string;

    it("allows admin to create a quick poll with answer options", async () => {
      const poll = await upsertQuickPollAdmin({
        title: "Community RO Filter Replacement Poll",
        question: "How frequently do you replace sediment and carbon pre-filters?",
        pollType: "SINGLE_CHOICE",
        coinReward: 20,
        status: "PUBLISHED",
        options: ["Every 3 months", "Every 6 months", "Annually", "Only when flow drops"],
        adminId: testAdminId,
      });

      expect(poll).toBeDefined();
      expect(poll.id).toBeDefined();
      pollId = poll.id;
    });

    it("allows user to vote and credits coins once", async () => {
      const availablePolls = await listAvailableQuickPolls(testCustomerId);
      const poll = availablePolls.find((p) => p.id === pollId);
      expect(poll).toBeDefined();
      expect(poll?.options.length).toBe(4);
      option1Id = poll!.options[0].id;

      const voteResult = await submitQuickPollVote({
        pollId,
        customerId: testCustomerId,
        selectedOptionIds: [option1Id],
      });

      expect(voteResult.success).toBe(true);
      expect(voteResult.coinsAwarded).toBe(20);
    });

    it("rejects duplicate votes from the same customer", async () => {
      const duplicateVote = await submitQuickPollVote({
        pollId,
        customerId: testCustomerId,
        selectedOptionIds: [option1Id],
      });

      expect(duplicateVote.success).toBe(false);
      expect(duplicateVote.error).toContain("already completed this poll");
    });
  });

  describe("4. Voucher Unlocking and Check Constraint Verification", () => {
    it("unlocks a voucher with coins without violating coin_transactions_type_check", async () => {
      const vouchers = await listAvailableVouchers(testCustomerId);
      const voucherToUnlock = vouchers.find((v) => !v.isUnlocked && v.coinCost > 0) || vouchers[0];

      if (voucherToUnlock && !voucherToUnlock.isUnlocked) {
        const unlockResult = await unlockVoucherWithCoins(testCustomerId, voucherToUnlock.id);
        expect(unlockResult.success).toBe(true);
        expect(unlockResult.voucher?.isUnlocked).toBe(true);
      }
    });
  });

  describe("5. Role-Based Permissions Verification", () => {
    it("verifies super admin has complete platform access", () => {
      expect(hasAdminPermission("SUPER_ADMIN", "store:strike_off")).toBe(true);
      expect(hasAdminPermission("SUPER_ADMIN", "files:review")).toBe(true);
      expect(hasAdminPermission("SUPER_ADMIN", "polls:write")).toBe(true);
      expect(hasAdminPermission("SUPER_ADMIN", "users:write")).toBe(true);
      expect(hasAdminPermission("SUPER_ADMIN", "settings:write")).toBe(true);
    });

    it("verifies reviewer role is strictly confined to document reviews and polls", () => {
      expect(hasAdminPermission("REVIEWER", "files:review")).toBe(true);
      expect(hasAdminPermission("REVIEWER", "files:read")).toBe(true);
      expect(hasAdminPermission("REVIEWER", "store:write")).toBe(false);
      expect(hasAdminPermission("REVIEWER", "settings:write")).toBe(false);
      expect(hasAdminPermission("REVIEWER", "users:delete")).toBe(false);
    });

    it("verifies product manager has store and merchandising control but not user management", () => {
      expect(hasAdminPermission("PRODUCT_MANAGER", "store:write")).toBe(true);
      expect(hasAdminPermission("PRODUCT_MANAGER", "store:strike_off")).toBe(true);
      expect(hasAdminPermission("PRODUCT_MANAGER", "content:write")).toBe(true);
      expect(hasAdminPermission("PRODUCT_MANAGER", "users:delete")).toBe(false);
      expect(hasAdminPermission("PRODUCT_MANAGER", "settings:write")).toBe(false);
    });

    it("verifies rewards manager controls surveys, polls, and file activities", () => {
      expect(hasAdminPermission("REWARDS_MANAGER", "surveys:publish")).toBe(true);
      expect(hasAdminPermission("REWARDS_MANAGER", "rewards:write")).toBe(true);
      expect(hasAdminPermission("REWARDS_MANAGER", "files:review")).toBe(true);
      expect(hasAdminPermission("REWARDS_MANAGER", "polls:write")).toBe(true);
      expect(hasAdminPermission("REWARDS_MANAGER", "store:strike_off")).toBe(false);
    });
  });
});
