import crypto from "crypto";
import { getSupabaseServerClient } from "./server";
import { isDirectDatabaseConfigured, getDirectSql } from "./direct-db";
import { getEnv } from "../env";
import { verifyOtpHash } from "../otp";

export interface CustomerRecord {
  id: string;
  customer_id: string;
  auth_user_id?: string | null;
  phone_e164: string;
  phone_verified_at?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  city?: string | null;
  onboarding_completed: boolean;
  reward_coins?: number;
  referral_code?: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface OtpChallengeRecord {
  id: string;
  phone_e164: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  resend_count: number;
  expires_at: string;
  verified_at?: string | null;
  ip_address?: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// In-Memory Fallback Store (Used when Supabase is unreachable or demo keys are used)
// -----------------------------------------------------------------------------
class InMemoryStore {
  private static instance: InMemoryStore;
  private sequenceCounter = 1;
  private customers = new Map<string, CustomerRecord>(); // key: phone_e164
  private customersById = new Map<string, CustomerRecord>(); // key: id
  private challenges = new Map<string, OtpChallengeRecord[]>(); // key: phone_e164
  private sessions = new Map<string, { customerId: string; expiresAt: Date }>();
  private attributions = new Map<string, any>(); // key: id
  private attributionsByReferee = new Map<string, any>(); // key: referee_id
  private auditEvents: Array<Record<string, unknown>> = [];

  public static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }

  // Atomic sequence generation matching Postgres: 'GH' || lpad(seq, 6, '0')
  public nextCustomerId(): string {
    const current = this.sequenceCounter++;
    return `GH${String(current).padStart(6, "0")}`;
  }

  public getCustomerByPhone(phone: string): CustomerRecord | null {
    return this.customers.get(phone) || null;
  }

  public getCustomerById(id: string): CustomerRecord | null {
    return this.customersById.get(id) || null;
  }

  public getCustomerByReferralCode(code: string): CustomerRecord | null {
    const clean = code.trim().toUpperCase();
    for (const c of this.customersById.values()) {
      if (c.referral_code && c.referral_code.toUpperCase() === clean) {
        return c;
      }
    }
    return null;
  }

  public addCustomerCoins(id: string, amount: number): CustomerRecord | null {
    const c = this.customersById.get(id);
    if (!c) return null;
    const updated = {
      ...c,
      reward_coins: (c.reward_coins || 0) + amount,
      updated_at: new Date().toISOString(),
    };
    this.customers.set(c.phone_e164, updated);
    this.customersById.set(id, updated);
    return updated;
  }

  public upsertCustomer(phone: string): CustomerRecord {
    const existing = this.customers.get(phone);
    const now = new Date().toISOString();

    if (existing) {
      const updated = {
        ...existing,
        phone_verified_at: now,
        updated_at: now,
      };
      this.customers.set(phone, updated);
      this.customersById.set(updated.id, updated);
      return updated;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCustomer: CustomerRecord = {
      id: crypto.randomUUID(),
      customer_id: this.nextCustomerId(),
      auth_user_id: null,
      phone_e164: phone,
      phone_verified_at: now,
      full_name: null,
      display_name: null,
      city: null,
      onboarding_completed: false,
      reward_coins: 100,
      referral_code: `GS${randomSuffix}`,
      created_at: now,
      updated_at: now,
    };

    this.customers.set(phone, newCustomer);
    this.customersById.set(newCustomer.id, newCustomer);
    return newCustomer;
  }

  public updateCustomerProfile(
    id: string,
    updates: { full_name: string; city?: string | null; display_name?: string | null }
  ): CustomerRecord | null {
    const customer = this.customersById.get(id);
    if (!customer) return null;

    const updated: CustomerRecord = {
      ...customer,
      full_name: updates.full_name,
      city: updates.city || null,
      display_name: updates.display_name || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    this.customers.set(customer.phone_e164, updated);
    this.customersById.set(id, updated);
    return updated;
  }

  public addChallenge(challenge: OtpChallengeRecord) {
    const list = this.challenges.get(challenge.phone_e164) || [];
    list.push(challenge);
    this.challenges.set(challenge.phone_e164, list);
  }

  public getChallenges(phone: string): OtpChallengeRecord[] {
    return this.challenges.get(phone) || [];
  }

  public updateChallenge(challenge: OtpChallengeRecord) {
    const list = this.challenges.get(challenge.phone_e164) || [];
    const index = list.findIndex((c) => c.id === challenge.id);
    if (index !== -1) {
      list[index] = challenge;
      this.challenges.set(challenge.phone_e164, list);
    }
  }

  public saveSession(tokenHash: string, customerId: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { customerId, expiresAt });
  }

  public removeSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  public addReferralAttribution(attr: any) {
    this.attributions.set(attr.id, attr);
    this.attributionsByReferee.set(attr.referee_id, attr);
  }

  public getReferralAttributionByReferee(refereeId: string) {
    return this.attributionsByReferee.get(refereeId) || null;
  }

  public getReferralAttributionById(id: string) {
    return this.attributions.get(id) || null;
  }

  public getReferralAttributions(referrerId?: string) {
    const all = Array.from(this.attributions.values());
    if (referrerId) {
      return all.filter((a) => a.referrer_id === referrerId);
    }
    return all;
  }

  public updateReferralAttribution(id: string, updates: Partial<any>) {
    const existing = this.attributions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.attributions.set(id, updated);
    this.attributionsByReferee.set(updated.referee_id, updated);
    return updated;
  }

  public logAudit(event: Record<string, unknown>) {
    this.auditEvents.push({ ...event, created_at: new Date().toISOString() });
  }

  public reset() {
    this.sequenceCounter = 1;
    this.customers.clear();
    this.customersById.clear();
    this.challenges.clear();
    this.sessions.clear();
    this.attributions.clear();
    this.attributionsByReferee.clear();
    this.auditEvents = [];
  }
}

const globalForDb = globalThis as unknown as { inMemoryDb?: InMemoryStore };
export const inMemoryDb = globalForDb.inMemoryDb ?? InMemoryStore.getInstance();
if (process.env.NODE_ENV !== "production") {
  globalForDb.inMemoryDb = inMemoryDb;
}

// Check if live Supabase REST API is configured with real URL and keys
function isLiveSupabaseAvailable(): boolean {
  const env = getEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.NEXT_PUBLIC_SUPABASE_URL.includes("demo-gharsure-project") &&
    !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes("demo-service-role-key") &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

// -----------------------------------------------------------------------------
// Database Operations (Supabase with In-Memory Resilient Fallback)
// -----------------------------------------------------------------------------

export async function createOtpChallenge({
  phoneE164,
  otpHash,
  ipAddress,
}: {
  phoneE164: string;
  otpHash: string;
  ipAddress?: string;
}): Promise<{ success: boolean; error?: string; retryAfterSeconds?: number }> {
  const env = getEnv();
  const now = new Date();

  // 1. Direct PostgreSQL connection via connection string
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const latest = await sql<OtpChallengeRecord[]>`
        SELECT * FROM otp_challenges
        WHERE phone_e164 = ${phoneE164}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (latest.length > 0) {
        const createdAt = new Date(latest[0].created_at).getTime();
        const elapsedSeconds = Math.floor((now.getTime() - createdAt) / 1000);

        if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
          const waitTime = env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
          return {
            success: false,
            error: `Please wait ${waitTime}s before requesting another OTP.`,
            retryAfterSeconds: waitTime,
          };
        }
      }

      const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();
      const countRes = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text as count FROM otp_challenges
        WHERE phone_e164 = ${phoneE164} AND created_at >= ${oneHourAgo}
      `;
      const count = parseInt(countRes[0]?.count || "0", 10);
      if (count >= env.OTP_MAX_SENDS_PER_WINDOW) {
        return {
          success: false,
          error: "Too many OTP requests for this number. Please try again in an hour.",
        };
      }

      const expiresAt = new Date(now.getTime() + env.OTP_EXPIRY_SECONDS * 1000).toISOString();
      await sql`
        INSERT INTO otp_challenges (phone_e164, otp_hash, attempts, max_attempts, expires_at, ip_address)
        VALUES (${phoneE164}, ${otpHash}, 0, ${env.OTP_MAX_ATTEMPTS}, ${expiresAt}, ${ipAddress || null})
      `;

      return { success: true };
    } catch (err) {
      console.warn("[Direct DB] Failed or unreachable, falling back:", (err as Error).message);
    }
  }

  // 2. Check rate limits & resend cooldown via Supabase REST API
  if (isLiveSupabaseAvailable()) {
    try {
      const supabase = getSupabaseServerClient();

      // Check latest challenge for cooldown
      const { data, error: queryError } = await supabase
        .from("otp_challenges")
        .select("*")
        .eq("phone_e164", phoneE164)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestChallenges = data as unknown as OtpChallengeRecord[] | null;

      if (!queryError && latestChallenges && latestChallenges.length > 0) {
        const latest = latestChallenges[0];
        const createdAt = new Date(latest.created_at).getTime();
        const elapsedSeconds = Math.floor((now.getTime() - createdAt) / 1000);

        if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
          const waitTime = env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
          return {
            success: false,
            error: `Please wait ${waitTime}s before requesting another OTP.`,
            retryAfterSeconds: waitTime,
          };
        }
      }

      // Check sends per window (1 hour)
      const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("otp_challenges")
        .select("*", { count: "exact", head: true })
        .eq("phone_e164", phoneE164)
        .gte("created_at", oneHourAgo);

      if (!countError && typeof count === "number" && count >= env.OTP_MAX_SENDS_PER_WINDOW) {
        return {
          success: false,
          error: "Too many OTP requests for this number. Please try again in an hour.",
        };
      }

      // Insert new challenge
      const expiresAt = new Date(now.getTime() + env.OTP_EXPIRY_SECONDS * 1000).toISOString();
      const { error: insertError } = await supabase.from("otp_challenges").insert({
        phone_e164: phoneE164,
        otp_hash: otpHash,
        attempts: 0,
        max_attempts: env.OTP_MAX_ATTEMPTS,
        expires_at: expiresAt,
        ip_address: ipAddress || null,
      });

      if (insertError) {
        throw insertError;
      }

      return { success: true };
    } catch (err) {
      console.warn("[Supabase] Failed or unreachable, using local store:", (err as Error).message);
    }
  }

  // In-Memory store handling
  const existing = inMemoryDb.getChallenges(phoneE164);
  if (existing.length > 0) {
    const latest = existing[existing.length - 1];
    const elapsedSeconds = Math.floor((now.getTime() - new Date(latest.created_at).getTime()) / 1000);

    if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
      const waitTime = env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        error: `Please wait ${waitTime}s before requesting another OTP.`,
        retryAfterSeconds: waitTime,
      };
    }

    const oneHourAgo = now.getTime() - 3600 * 1000;
    const recentSends = existing.filter((c) => new Date(c.created_at).getTime() >= oneHourAgo).length;
    if (recentSends >= env.OTP_MAX_SENDS_PER_WINDOW) {
      return {
        success: false,
        error: "Too many OTP requests for this number. Please try again in an hour.",
      };
    }
  }

  const expiresAt = new Date(now.getTime() + env.OTP_EXPIRY_SECONDS * 1000).toISOString();
  const challenge: OtpChallengeRecord = {
    id: crypto.randomUUID(),
    phone_e164: phoneE164,
    otp_hash: otpHash,
    attempts: 0,
    max_attempts: env.OTP_MAX_ATTEMPTS,
    resend_count: existing.length,
    expires_at: expiresAt,
    ip_address: ipAddress || null,
    created_at: now.toISOString(),
  };

  inMemoryDb.addChallenge(challenge);
  return { success: true };
}

export async function verifyOtpChallenge({
  phoneE164,
  candidateOtp,
}: {
  phoneE164: string;
  candidateOtp: string;
}): Promise<{
  success: boolean;
  error?: string;
  errorCode?: "INVALID_CODE" | "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "NOT_FOUND";
}> {
  const now = new Date();

  // 1. Direct PostgreSQL connection via connection string
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const challenges = await sql<OtpChallengeRecord[]>`
        SELECT * FROM otp_challenges
        WHERE phone_e164 = ${phoneE164} AND verified_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (challenges.length === 0) {
        return {
          success: false,
          error: "No active verification challenge found. Please request a new OTP.",
          errorCode: "NOT_FOUND",
        };
      }

      const challenge = challenges[0];

      // Check expiration
      if (new Date(challenge.expires_at) < now) {
        return {
          success: false,
          error: "OTP has expired. Please request a new code.",
          errorCode: "EXPIRED",
        };
      }

      // Check max attempts
      if (challenge.attempts >= challenge.max_attempts) {
        return {
          success: false,
          error: "Maximum verification attempts exceeded. Please request a new OTP.",
          errorCode: "MAX_ATTEMPTS_EXCEEDED",
        };
      }

      // Increment attempt counter
      await sql`
        UPDATE otp_challenges
        SET attempts = ${challenge.attempts + 1}
        WHERE id = ${challenge.id}
      `;

      const isValid = verifyOtpHash(candidateOtp, challenge.otp_hash, phoneE164);

      if (!isValid) {
        const remaining = challenge.max_attempts - (challenge.attempts + 1);
        return {
          success: false,
          error: remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : "Incorrect OTP. Maximum attempts exceeded.",
          errorCode: "INVALID_CODE",
        };
      }

      // Mark challenge as verified
      await sql`
        UPDATE otp_challenges
        SET verified_at = ${now.toISOString()}
        WHERE id = ${challenge.id}
      `;

      return { success: true };
    } catch (err) {
      console.warn("[Direct DB] Fallback to in-memory store during verify:", (err as Error).message);
    }
  }

  // 2. Supabase REST API check
  if (isLiveSupabaseAvailable()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("otp_challenges")
        .select("*")
        .eq("phone_e164", phoneE164)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const challenges = data as unknown as OtpChallengeRecord[] | null;

      if (error || !challenges || challenges.length === 0) {
        return {
          success: false,
          error: "No active verification challenge found. Please request a new OTP.",
          errorCode: "NOT_FOUND",
        };
      }

      const challenge = challenges[0];

      // Check expiration
      if (new Date(challenge.expires_at) < now) {
        return {
          success: false,
          error: "OTP has expired. Please request a new code.",
          errorCode: "EXPIRED",
        };
      }

      // Check max attempts
      if (challenge.attempts >= challenge.max_attempts) {
        return {
          success: false,
          error: "Maximum verification attempts exceeded. Please request a new OTP.",
          errorCode: "MAX_ATTEMPTS_EXCEEDED",
        };
      }

      // Increment attempt counter
      await supabase
        .from("otp_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id);

      const isValid = verifyOtpHash(candidateOtp, challenge.otp_hash, phoneE164);

      if (!isValid) {
        const remaining = challenge.max_attempts - (challenge.attempts + 1);
        return {
          success: false,
          error: remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : "Incorrect OTP. Maximum attempts exceeded.",
          errorCode: "INVALID_CODE",
        };
      }

      // Mark challenge as verified
      await supabase
        .from("otp_challenges")
        .update({ verified_at: now.toISOString() })
        .eq("id", challenge.id);

      return { success: true };
    } catch (err) {
      console.warn("[Supabase] Fallback to in-memory store during verify:", (err as Error).message);
    }
  }

  // In-Memory store verification
  const challenges = inMemoryDb.getChallenges(phoneE164);
  const activeChallenges = challenges.filter((c) => !c.verified_at);

  if (activeChallenges.length === 0) {
    return {
      success: false,
      error: "No active verification challenge found. Please request a new OTP.",
      errorCode: "NOT_FOUND",
    };
  }

  const challenge = activeChallenges[activeChallenges.length - 1];

  // Expiration
  if (new Date(challenge.expires_at) < now) {
    return {
      success: false,
      error: "OTP has expired. Please request a new code.",
      errorCode: "EXPIRED",
    };
  }

  // Max attempts
  if (challenge.attempts >= challenge.max_attempts) {
    return {
      success: false,
      error: "Maximum verification attempts exceeded. Please request a new OTP.",
      errorCode: "MAX_ATTEMPTS_EXCEEDED",
    };
  }

  challenge.attempts += 1;
  const isValid = verifyOtpHash(candidateOtp, challenge.otp_hash, phoneE164);

  if (!isValid) {
    inMemoryDb.updateChallenge(challenge);
    const remaining = challenge.max_attempts - challenge.attempts;
    return {
      success: false,
      error: remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : "Incorrect OTP. Maximum attempts exceeded.",
      errorCode: "INVALID_CODE",
    };
  }

  challenge.verified_at = now.toISOString();
  inMemoryDb.updateChallenge(challenge);

  return { success: true };
}

export async function getOrCreateCustomer(phoneE164: string): Promise<CustomerRecord> {
  const now = new Date().toISOString();

  // 1. Direct PostgreSQL connection via connection string
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<CustomerRecord[]>`
        INSERT INTO customers (phone_e164, phone_verified_at)
        VALUES (${phoneE164}, NOW())
        ON CONFLICT (phone_e164)
        DO UPDATE SET phone_verified_at = NOW(), updated_at = NOW()
        RETURNING *
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.warn("[Direct DB] Fallback during getOrCreateCustomer:", (err as Error).message);
    }
  }

  // 2. Supabase REST API
  if (isLiveSupabaseAvailable()) {
    try {
      const supabase = getSupabaseServerClient();

      // Concurrency-safe atomic insert or update in PostgreSQL:
      // Uses the sequence default for customer_id on insert, while preserving existing customer_id on conflict.
      const { data, error } = await supabase
        .from("customers")
        .upsert(
          {
            phone_e164: phoneE164,
            phone_verified_at: now,
          },
          {
            onConflict: "phone_e164",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (!error && data) {
        return data as unknown as CustomerRecord;
      }

      console.warn("[Supabase] Upsert failed, falling back to local store:", error?.message);
    } catch (err) {
      console.warn("[Supabase] Fallback during getOrCreateCustomer:", (err as Error).message);
    }
  }

  return inMemoryDb.upsertCustomer(phoneE164);
}

export async function getCustomerById(id: string): Promise<CustomerRecord | null> {
  // 1. Direct PostgreSQL connection via connection string
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<CustomerRecord[]>`
        SELECT * FROM customers WHERE id = ${id}
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (err) {
      console.warn("[Direct DB] Fallback during getCustomerById:", (err as Error).message);
    }
  }

  // 2. Supabase REST API
  if (isLiveSupabaseAvailable()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return data as unknown as CustomerRecord;
      }
    } catch (err) {
      console.warn("[Supabase] Fallback during getCustomerById:", (err as Error).message);
    }
  }

  return inMemoryDb.getCustomerById(id);
}

export async function updateCustomerProfile(
  id: string,
  profile: {
    fullName: string;
    city?: string | null;
    displayName?: string | null;
  }
): Promise<CustomerRecord> {
  const now = new Date().toISOString();

  // 1. Direct PostgreSQL connection via connection string
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<CustomerRecord[]>`
        UPDATE customers
        SET full_name = ${profile.fullName.trim()},
            city = ${profile.city?.trim() || null},
            display_name = ${profile.displayName?.trim() || null},
            onboarding_completed = true,
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.warn("[Direct DB] Fallback during updateCustomerProfile:", (err as Error).message);
    }
  }

  // 2. Supabase REST API
  if (isLiveSupabaseAvailable()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("customers")
        .update({
          full_name: profile.fullName.trim(),
          city: profile.city?.trim() || null,
          display_name: profile.displayName?.trim() || null,
          onboarding_completed: true,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return data as unknown as CustomerRecord;
      }
      throw error;
    } catch (err) {
      console.warn("[Supabase] Fallback during updateCustomerProfile:", (err as Error).message);
    }
  }

  const updated = inMemoryDb.updateCustomerProfile(id, {
    full_name: profile.fullName.trim(),
    city: profile.city?.trim() || null,
    display_name: profile.displayName?.trim() || null,
  });

  if (!updated) {
    throw new Error("Customer profile not found to update.");
  }

  return updated;
}

export async function logAuditEvent(
  eventType: string,
  phoneE164?: string,
  customerId?: string,
  ipAddress?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // 1. Direct PostgreSQL connection via connection string
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`
        INSERT INTO audit_events (event_type, phone_e164, customer_id, ip_address, metadata)
        VALUES (
          ${eventType},
          ${phoneE164 || null},
          ${customerId || null},
          ${ipAddress || null},
          ${sql.json((metadata as any) || {})}
        )
      `;
      return;
    } catch (err) {
      console.warn("[Direct DB] Audit event log failed:", (err as Error).message);
    }
  }

  // 2. Supabase REST API
  if (isLiveSupabaseAvailable()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("audit_events").insert({
        event_type: eventType,
        phone_e164: phoneE164 || null,
        customer_id: customerId || null,
        ip_address: ipAddress || null,
        metadata: (metadata as any) || {},
      });
      return;
    } catch (err) {
      console.warn("[Supabase] Audit event log failed:", (err as Error).message);
    }
  }

  inMemoryDb.logAudit({
    event_type: eventType,
    phone_e164: phoneE164,
    customer_id: customerId,
    ip_address: ipAddress,
    metadata,
  });
}
