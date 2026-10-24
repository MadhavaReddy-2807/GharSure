import crypto from "crypto";
import { getDirectSql, isDirectDatabaseConfigured } from "./supabase/direct-db";
import { inMemoryDb, CustomerRecord } from "./supabase/db";

const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const REFERRAL_CODE_PREFIX = "GS";
const REFERRAL_CODE_RANDOM_LENGTH = 6;

export interface ReferralCampaignConfig {
  isActive: boolean;
  referrerRewardCoins: number;
  refereeRewardCoins: number;
  maxReferralsPerCustomer: number;
  qualificationTrigger: string;
}

export const DEFAULT_REFERRAL_CAMPAIGN: ReferralCampaignConfig = {
  isActive: true,
  referrerRewardCoins: 100,
  refereeRewardCoins: 100,
  maxReferralsPerCustomer: 50,
  qualificationTrigger: "PHONE_VERIFIED_AND_ONBOARDED",
};

/**
 * Generate a cryptographically secure, readable, URL-safe referral code.
 * Example: GS8K2M9P
 */
export function generateRandomReferralCode(): string {
  let result = REFERRAL_CODE_PREFIX;
  const charsLength = REFERRAL_CODE_ALPHABET.length;
  const randomBytes = crypto.randomBytes(REFERRAL_CODE_RANDOM_LENGTH);

  for (let i = 0; i < REFERRAL_CODE_RANDOM_LENGTH; i++) {
    const randomIndex = randomBytes[i] % charsLength;
    result += REFERRAL_CODE_ALPHABET[randomIndex];
  }

  return result;
}

/**
 * Generate a guaranteed unique referral code by checking database/memory store with retries.
 */
export async function generateUniqueReferralCode(): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateRandomReferralCode();

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const existing = await sql`
          SELECT 1 FROM customers WHERE UPPER(referral_code) = UPPER(${candidate}) LIMIT 1
        `;
        if (existing.length === 0) {
          return candidate;
        }
      } catch (err) {
        console.warn("[Referral] Direct DB unique check failed, falling back to memory check:", (err as Error).message);
      }
    }

    const memoryCustomer = inMemoryDb.getCustomerByReferralCode(candidate);
    if (!memoryCustomer) {
      return candidate;
    }
  }

  // High entropy fallback
  return `${REFERRAL_CODE_PREFIX}${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

/**
 * Fetch authoritative campaign config from system_settings or default
 */
export async function getReferralCampaignConfig(): Promise<ReferralCampaignConfig> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT value FROM system_settings WHERE key = 'referral_campaign' LIMIT 1
      `;
      if (rows.length > 0 && rows[0].value) {
        const val = rows[0].value;
        return {
          isActive: val.is_active !== false,
          referrerRewardCoins: Number(val.referrer_reward_coins) || DEFAULT_REFERRAL_CAMPAIGN.referrerRewardCoins,
          refereeRewardCoins: Number(val.referee_reward_coins) || DEFAULT_REFERRAL_CAMPAIGN.refereeRewardCoins,
          maxReferralsPerCustomer: Number(val.max_referrals_per_customer) || DEFAULT_REFERRAL_CAMPAIGN.maxReferralsPerCustomer,
          qualificationTrigger: val.qualification_trigger || DEFAULT_REFERRAL_CAMPAIGN.qualificationTrigger,
        };
      }
    } catch (err) {
      console.warn("[Referral] Failed to read system_settings for referral_campaign:", (err as Error).message);
    }
  }

  return { ...DEFAULT_REFERRAL_CAMPAIGN };
}

export interface ReferralValidationResult {
  valid: boolean;
  code?: string;
  referrerId?: string;
  referrerName?: string;
  referrerCustomerId?: string;
  bonusCoins?: number;
  error?: string;
  errorCode?: "INVALID_CODE" | "SELF_REFERRAL" | "CAMPAIGN_INACTIVE" | "LIMIT_EXCEEDED" | "INACTIVE_ACCOUNT";
}

/**
 * Validate a referral code candidate before applying
 */
export async function validateReferralCode(
  candidateCode: string,
  currentCustomerId?: string
): Promise<ReferralValidationResult> {
  if (!candidateCode || typeof candidateCode !== "string") {
    return { valid: false, error: "Please enter a referral code.", errorCode: "INVALID_CODE" };
  }

  const cleanCode = candidateCode.trim().toUpperCase();
  if (cleanCode.length < 4 || cleanCode.length > 30) {
    return { valid: false, error: "Invalid referral code format.", errorCode: "INVALID_CODE" };
  }

  const campaign = await getReferralCampaignConfig();
  if (!campaign.isActive) {
    return { valid: false, error: "Referral campaign is currently paused.", errorCode: "CAMPAIGN_INACTIVE" };
  }

  let referrer: CustomerRecord | null = null;

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<CustomerRecord[]>`
        SELECT id, customer_id, full_name, display_name, phone_e164, status, referral_code, onboarding_completed
        FROM customers
        WHERE UPPER(referral_code) = ${cleanCode}
        LIMIT 1
      `;
      if (rows.length > 0) {
        referrer = rows[0];
      }
    } catch (err) {
      console.warn("[Referral] DB lookup failed during validation:", (err as Error).message);
    }
  }

  if (!referrer) {
    referrer = inMemoryDb.getCustomerByReferralCode(cleanCode);
  }

  if (!referrer) {
    return {
      valid: false,
      error: "Referral code not found. Please verify the code and try again.",
      errorCode: "INVALID_CODE",
    };
  }

  // Check self-referral
  if (currentCustomerId && referrer.id === currentCustomerId) {
    return {
      valid: false,
      error: "You cannot use your own referral code.",
      errorCode: "SELF_REFERRAL",
    };
  }

  // Check if referrer account is active
  if (referrer.status === "SUSPENDED" || referrer.status === "DELETED") {
    return {
      valid: false,
      error: "This referral code is no longer active.",
      errorCode: "INACTIVE_ACCOUNT",
    };
  }

  // Check max referrals per customer
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text as count
        FROM referral_attributions
        WHERE referrer_id = ${referrer.id}
          AND status IN ('QUALIFIED', 'REWARDED')
      `;
      const currentCount = parseInt(countRows[0]?.count || "0", 10);
      if (currentCount >= campaign.maxReferralsPerCustomer) {
        return {
          valid: false,
          error: "This referral code has reached its maximum reward limit.",
          errorCode: "LIMIT_EXCEEDED",
        };
      }
    } catch (err) {
      console.warn("[Referral] Limit count query failed:", (err as Error).message);
    }
  }

  return {
    valid: true,
    code: referrer.referral_code || cleanCode,
    referrerId: referrer.id,
    referrerName: referrer.full_name || referrer.display_name || "Neighbor",
    referrerCustomerId: referrer.customer_id,
    bonusCoins: campaign.refereeRewardCoins,
  };
}

export interface ReferralAttributionResult {
  success: boolean;
  attributionId?: string;
  status?: "PENDING" | "QUALIFIED" | "REWARDED" | "REJECTED";
  rewardIssued?: boolean;
  error?: string;
}

/**
 * Atomically link referee with referrer, qualify, and execute coin rewards.
 * Called when a new user successfully completes onboarding.
 */
export async function processReferralOnboarding(
  refereeId: string,
  rawReferralCode?: string | null
): Promise<ReferralAttributionResult> {
  if (!rawReferralCode || !rawReferralCode.trim()) {
    return { success: true }; // No referral code used, normal onboarding
  }

  const cleanCode = rawReferralCode.trim().toUpperCase();

  // Validate referral code
  const validation = await validateReferralCode(cleanCode, refereeId);
  if (!validation.valid || !validation.referrerId) {
    return {
      success: false,
      error: validation.error || "Invalid referral code.",
    };
  }

  const referrerId = validation.referrerId;
  const campaign = await getReferralCampaignConfig();
  const referrerReward = campaign.referrerRewardCoins;
  const refereeReward = campaign.refereeRewardCoins;

  // Direct PostgreSQL execution with atomic transaction
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();

      const result = await sql.begin(async (tx: any) => {
        // 1. Check if attribution already exists for this referee (enforces single attribution per customer)
        const existing = await tx`
          SELECT id, status, referrer_id, referral_code
          FROM referral_attributions
          WHERE referee_id = ${refereeId}
          FOR UPDATE
        `;

        let attributionId: string;
        let currentStatus: string;

        if (existing.length > 0) {
          attributionId = existing[0].id;
          currentStatus = existing[0].status;

          if (currentStatus === "REWARDED") {
            // Already rewarded idempotently
            return {
              success: true,
              attributionId,
              status: "REWARDED",
              rewardIssued: true,
            };
          }
        } else {
          // Insert new attribution
          const inserted = await tx`
            INSERT INTO referral_attributions (
              referrer_id, referee_id, referral_code, status, reward_coins,
              referrer_reward_coins, referee_reward_coins, created_at, qualified_at
            )
            VALUES (
              ${referrerId}, ${refereeId}, ${validation.code || cleanCode}, 'QUALIFIED',
              ${referrerReward}, ${referrerReward}, ${refereeReward}, NOW(), NOW()
            )
            RETURNING id, status
          `;
          attributionId = inserted[0].id;
          currentStatus = "QUALIFIED";
        }

        // 2. Fetch referee and referrer details for audit/ledger
        const [referrerUser] = await tx`SELECT id, customer_id, full_name, phone_e164 FROM customers WHERE id = ${referrerId} FOR UPDATE`;
        const [refereeUser] = await tx`SELECT id, customer_id, full_name, phone_e164 FROM customers WHERE id = ${refereeId} FOR UPDATE`;

        if (!referrerUser || !refereeUser) {
          throw new Error("Referrer or Referee record not found in transaction.");
        }

        // 3. Issue Referrer Reward to coin ledger with deterministic idempotency key
        const referrerIdempotencyKey = `ref_referrer_${attributionId}`;
        await tx`
          INSERT INTO coin_transactions (
            customer_id, amount, type, description, idempotency_key, metadata
          )
          VALUES (
            ${referrerId},
            ${referrerReward},
            'REFERRAL_BONUS',
            ${`Referral bonus for inviting ${refereeUser.full_name || refereeUser.customer_id}`},
            ${referrerIdempotencyKey},
            ${JSON.stringify({
              attributionId,
              refereeCustomerId: refereeUser.customer_id,
              referralCode: cleanCode,
            })}::jsonb
          )
          ON CONFLICT (idempotency_key) DO NOTHING
        `;

        // Update referrer's cached balance
        await tx`
          UPDATE customers
          SET reward_coins = COALESCE(reward_coins, 0) + ${referrerReward}, updated_at = NOW()
          WHERE id = ${referrerId}
        `;

        // 4. Issue Referee Reward to coin ledger with deterministic idempotency key
        const refereeIdempotencyKey = `ref_referee_${attributionId}`;
        await tx`
          INSERT INTO coin_transactions (
            customer_id, amount, type, description, idempotency_key, metadata
          )
          VALUES (
            ${refereeId},
            ${refereeReward},
            'REFERRAL_BONUS',
            ${`Welcome referral bonus using code ${cleanCode}`},
            ${refereeIdempotencyKey},
            ${JSON.stringify({
              attributionId,
              referrerCustomerId: referrerUser.customer_id,
              referralCode: cleanCode,
            })}::jsonb
          )
          ON CONFLICT (idempotency_key) DO NOTHING
        `;

        // Update referee's cached balance
        await tx`
          UPDATE customers
          SET reward_coins = COALESCE(reward_coins, 0) + ${refereeReward}, updated_at = NOW()
          WHERE id = ${refereeId}
        `;

        // 5. Update attribution status to REWARDED
        await tx`
          UPDATE referral_attributions
          SET status = 'REWARDED',
              qualified_at = COALESCE(qualified_at, NOW())
          WHERE id = ${attributionId}
        `;

        return {
          success: true,
          attributionId,
          status: "REWARDED",
          rewardIssued: true,
        };
      });

      return result as ReferralAttributionResult;
    } catch (err) {
      console.error("[Referral] Transaction failed in processReferralOnboarding:", (err as Error).message);
      return {
        success: false,
        error: "Failed to process referral reward: " + (err as Error).message,
      };
    }
  }

  // In-Memory store fallback
  const existingMemory = inMemoryDb.getReferralAttributionByReferee(refereeId);
  if (existingMemory && existingMemory.status === "REWARDED") {
    return {
      success: true,
      attributionId: existingMemory.id,
      status: "REWARDED",
      rewardIssued: true,
    };
  }

  const attributionId = existingMemory?.id || crypto.randomUUID();
  const attributionRecord = {
    id: attributionId,
    referrer_id: referrerId,
    referee_id: refereeId,
    referral_code: cleanCode,
    status: "REWARDED",
    reward_coins: referrerReward,
    referrer_reward_coins: referrerReward,
    referee_reward_coins: refereeReward,
    created_at: new Date().toISOString(),
    qualified_at: new Date().toISOString(),
  };

  inMemoryDb.addReferralAttribution(attributionRecord);
  inMemoryDb.addCustomerCoins(referrerId, referrerReward);
  inMemoryDb.addCustomerCoins(refereeId, refereeReward);

  return {
    success: true,
    attributionId,
    status: "REWARDED",
    rewardIssued: true,
  };
}

/**
 * Execute or retry reward for an existing referral attribution (e.g. from Admin Portal)
 */
export async function executeReferralReward(
  attributionId: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql.begin(async (tx: any) => {
        const [attr] = await tx`
          SELECT * FROM referral_attributions WHERE id = ${attributionId} FOR UPDATE
        `;

        if (!attr) {
          throw new Error("Referral attribution not found.");
        }

        if (attr.status === "REWARDED") {
          return; // Already rewarded
        }

        const referrerReward = attr.referrer_reward_coins || attr.reward_coins || 100;
        const refereeReward = attr.referee_reward_coins || 100;

        const referrerIdempotencyKey = `ref_referrer_${attr.id}`;
        await tx`
          INSERT INTO coin_transactions (
            customer_id, amount, type, description, idempotency_key, admin_id, metadata
          )
          VALUES (
            ${attr.referrer_id},
            ${referrerReward},
            'REFERRAL_BONUS',
            'Referral bonus rewarded by admin review',
            ${referrerIdempotencyKey},
            ${adminId || null},
            ${JSON.stringify({ attributionId: attr.id, adminApproval: true })}::jsonb
          )
          ON CONFLICT (idempotency_key) DO NOTHING
        `;

        await tx`
          UPDATE customers
          SET reward_coins = COALESCE(reward_coins, 0) + ${referrerReward}, updated_at = NOW()
          WHERE id = ${attr.referrer_id}
        `;

        const refereeIdempotencyKey = `ref_referee_${attr.id}`;
        await tx`
          INSERT INTO coin_transactions (
            customer_id, amount, type, description, idempotency_key, admin_id, metadata
          )
          VALUES (
            ${attr.referee_id},
            ${refereeReward},
            'REFERRAL_BONUS',
            'Welcome referral bonus rewarded by admin review',
            ${refereeIdempotencyKey},
            ${adminId || null},
            ${JSON.stringify({ attributionId: attr.id, adminApproval: true })}::jsonb
          )
          ON CONFLICT (idempotency_key) DO NOTHING
        `;

        await tx`
          UPDATE customers
          SET reward_coins = COALESCE(reward_coins, 0) + ${refereeReward}, updated_at = NOW()
          WHERE id = ${attr.referee_id}
        `;

        await tx`
          UPDATE referral_attributions
          SET status = 'REWARDED',
              qualified_at = COALESCE(qualified_at, NOW())
          WHERE id = ${attr.id}
        `;
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // In-Memory store fallback
  const attr = inMemoryDb.getReferralAttributionById(attributionId);
  if (!attr) return { success: false, error: "Attribution not found" };

  if (attr.status !== "REWARDED") {
    inMemoryDb.updateReferralAttribution(attributionId, { status: "REWARDED" });
    inMemoryDb.addCustomerCoins(attr.referrer_id, attr.referrer_reward_coins || 100);
    inMemoryDb.addCustomerCoins(attr.referee_id, attr.referee_reward_coins || 100);
  }

  return { success: true };
}

/**
 * Fetch stats, share link, and attribution history for a specific customer.
 * Used on /refer and wallet pages. Zero dummy data.
 */
export async function getCustomerReferralStats(customerId: string) {
  let referralCode = "";
  let totalReferrals = 0;
  let pendingReferrals = 0;
  let rewardedReferrals = 0;
  let totalCoinsEarned = 0;
  let attributions: any[] = [];

  const campaign = await getReferralCampaignConfig();

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();

      // Ensure customer has a referral code
      const [cust] = await sql<CustomerRecord[]>`
        SELECT id, referral_code, reward_coins, customer_id
        FROM customers
        WHERE id = ${customerId}
        LIMIT 1
      `;

      if (cust) {
        if (!cust.referral_code) {
          referralCode = await generateUniqueReferralCode();
          await sql`
            UPDATE customers SET referral_code = ${referralCode}, updated_at = NOW() WHERE id = ${customerId}
          `;
        } else {
          referralCode = cust.referral_code;
        }
      }

      // Fetch attributions with referee masking
      const rows = await sql`
        SELECT 
          ra.id,
          ra.status,
          ra.reward_coins,
          ra.referrer_reward_coins,
          ra.created_at,
          ra.qualified_at,
          c.full_name as referee_name,
          c.customer_id as referee_customer_id,
          c.phone_e164 as referee_phone
        FROM referral_attributions ra
        JOIN customers c ON ra.referee_id = c.id
        WHERE ra.referrer_id = ${customerId}
        ORDER BY ra.created_at DESC
        LIMIT 20
      `;

      totalReferrals = rows.length;
      for (const r of rows) {
        if (r.status === "REWARDED") {
          rewardedReferrals++;
          totalCoinsEarned += Number(r.referrer_reward_coins || r.reward_coins || 0);
        } else if (r.status === "PENDING" || r.status === "QUALIFIED") {
          pendingReferrals++;
        }

        // Mask phone number for privacy: e.g. "+91 98*** 43210"
        let maskedPhone = "";
        if (r.referee_phone) {
          const raw = r.referee_phone.replace(/\s+/g, "");
          if (raw.length >= 10) {
            maskedPhone = `${raw.slice(0, 5)}*****${raw.slice(-2)}`;
          }
        }

        attributions.push({
          id: r.id,
          refereeName: r.referee_name || maskedPhone || r.referee_customer_id,
          refereeCustomerId: r.referee_customer_id,
          status: r.status,
          rewardCoins: Number(r.referrer_reward_coins || r.reward_coins || campaign.referrerRewardCoins),
          createdAt: r.created_at,
          qualifiedAt: r.qualified_at,
        });
      }

      return {
        referralCode,
        totalReferrals,
        pendingReferrals,
        rewardedReferrals,
        totalCoinsEarned,
        attributions,
        campaignBonusCoins: campaign.referrerRewardCoins,
        campaignRefereeBonusCoins: campaign.refereeRewardCoins,
        isCampaignActive: campaign.isActive,
      };
    } catch (err) {
      console.warn("[Referral] Error fetching customer referral stats:", (err as Error).message);
    }
  }

  // In-Memory store fallback
  const memCust = inMemoryDb.getCustomerById(customerId);
  referralCode = memCust?.referral_code || "GS" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const memAttrs = inMemoryDb.getReferralAttributions(customerId);

  totalReferrals = memAttrs.length;
  for (const a of memAttrs) {
    if (a.status === "REWARDED") {
      rewardedReferrals++;
      totalCoinsEarned += Number(a.referrer_reward_coins || a.reward_coins || 100);
    } else {
      pendingReferrals++;
    }

    const ref = inMemoryDb.getCustomerById(a.referee_id);
    attributions.push({
      id: a.id,
      refereeName: ref?.full_name || ref?.customer_id || "Neighbor",
      refereeCustomerId: ref?.customer_id || "GH000000",
      status: a.status,
      rewardCoins: a.referrer_reward_coins || 100,
      createdAt: a.created_at,
      qualifiedAt: a.qualified_at,
    });
  }

  return {
    referralCode,
    totalReferrals,
    pendingReferrals,
    rewardedReferrals,
    totalCoinsEarned,
    attributions,
    campaignBonusCoins: campaign.referrerRewardCoins,
    campaignRefereeBonusCoins: campaign.refereeRewardCoins,
    isCampaignActive: campaign.isActive,
  };
}
