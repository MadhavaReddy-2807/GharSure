import { getDirectSql, isDirectDatabaseConfigured } from "./supabase/direct-db";
import { AdminRole } from "./admin-auth";
import { executeReferralReward } from "./referral";

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: AdminRole;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  permissions: string[];
  invited_by?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface DashboardMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newRegistrations7d: number;
  surveysPublished: number;
  surveysCompleted: number;
  coinsIssued: number;
  coinsRedeemed: number;
  totalProducts: number;
  activeTrials: number;
  totalBuildings: number;
  openTickets: number;
  recentAuditEvents: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    phone_e164?: string | null;
    ip_address?: string | null;
    created_at: string;
    metadata?: Record<string, unknown> | null;
  }>;
}

// -----------------------------------------------------------------------------
// Admin Authentication & Access Management
// -----------------------------------------------------------------------------

export async function getAdminByEmail(email: string): Promise<AdminUserRecord | null> {
  if (!isDirectDatabaseConfigured()) return null;
  const sql = getDirectSql();
  const rows = await sql<AdminUserRecord[]>`
    SELECT id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at
    FROM admin_users
    WHERE LOWER(email) = LOWER(${email.trim()})
    LIMIT 1;
  `;
  return rows[0] || null;
}

export async function getAdminById(id: string): Promise<AdminUserRecord | null> {
  if (!isDirectDatabaseConfigured()) return null;
  const sql = getDirectSql();
  const rows = await sql<AdminUserRecord[]>`
    SELECT id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at
    FROM admin_users
    WHERE id = ${id}
    LIMIT 1;
  `;
  return rows[0] || null;
}

export async function recordAdminLogin(id: string): Promise<void> {
  if (!isDirectDatabaseConfigured()) return;
  const sql = getDirectSql();
  await sql`
    UPDATE admin_users
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function listAdmins(): Promise<Omit<AdminUserRecord, "password_hash">[]> {
  if (!isDirectDatabaseConfigured()) return [];
  const sql = getDirectSql();
  const rows = await sql<Omit<AdminUserRecord, "password_hash">[]>`
    SELECT id, email, full_name, role, status, permissions, invited_by, created_at, updated_at, last_login_at
    FROM admin_users
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function countActiveSuperAdmins(): Promise<number> {
  if (!isDirectDatabaseConfigured()) return 1;
  const sql = getDirectSql();
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text as count
    FROM admin_users
    WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE';
  `;
  return parseInt(rows[0]?.count || "0", 10);
}

export async function createAdminUser(data: {
  email: string;
  fullName: string;
  passwordHash: string;
  role: AdminRole;
  invitedBy?: string;
}): Promise<AdminUserRecord> {
  const sql = getDirectSql();
  const rows = await sql<AdminUserRecord[]>`
    INSERT INTO admin_users (email, full_name, password_hash, role, status, invited_by)
    VALUES (${data.email.toLowerCase().trim()}, ${data.fullName.trim()}, ${data.passwordHash}, ${data.role}, 'ACTIVE', ${data.invitedBy || null})
    RETURNING id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at;
  `;
  return rows[0];
}

export async function updateAdminUser(
  id: string,
  data: {
    fullName?: string;
    role?: AdminRole;
    status?: "ACTIVE" | "SUSPENDED";
    passwordHash?: string;
  }
): Promise<AdminUserRecord> {
  const sql = getDirectSql();

  // If attempting to demote or suspend, verify it's not the last super admin
  if (data.role || data.status) {
    const existing = await getAdminById(id);
    if (existing?.role === "SUPER_ADMIN") {
      const isDemotion = data.role && data.role !== "SUPER_ADMIN";
      const isSuspension = data.status && data.status === "SUSPENDED";
      if (isDemotion || isSuspension) {
        const superCount = await countActiveSuperAdmins();
        if (superCount <= 1) {
          throw new Error("Action denied: Cannot demote or suspend the last active Super Admin.");
        }
      }
    }
  }

  const rows = await sql<AdminUserRecord[]>`
    UPDATE admin_users
    SET 
      full_name = COALESCE(${data.fullName ? data.fullName.trim() : null}, full_name),
      role = COALESCE(${data.role || null}, role),
      status = COALESCE(${data.status || null}, status),
      password_hash = COALESCE(${data.passwordHash || null}, password_hash),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at;
  `;
  return rows[0];
}

// -----------------------------------------------------------------------------
// Admin Audit Logging
// -----------------------------------------------------------------------------

export async function logAdminAuditEvent(data: {
  eventType: string;
  adminId?: string | null;
  customerId?: string | null;
  phone?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (!isDirectDatabaseConfigured()) return;
    const sql = getDirectSql();
    await sql`
      INSERT INTO audit_events (event_type, actor_type, admin_id, customer_id, phone_e164, ip_address, metadata)
      VALUES (
        ${data.eventType},
        ${data.adminId ? "ADMIN" : "CUSTOMER"},
        ${data.adminId || null},
        ${data.customerId || null},
        ${data.phone || null},
        ${data.ipAddress || null},
        ${JSON.stringify(data.metadata || {})}::jsonb
      );
    `;
  } catch (err) {
    console.error("Failed to log admin audit event:", err);
  }
}

export async function listAuditEvents(params?: {
  limit?: number;
  offset?: number;
  eventType?: string;
  actorType?: string;
}): Promise<{ events: any[]; total: number }> {
  const sql = getDirectSql();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  const countResult = await sql<{ count: string }[]>`
    SELECT count(*)::text as count
    FROM audit_events
    WHERE (${params?.eventType || null}::text IS NULL OR event_type = ${params?.eventType || null})
      AND (${params?.actorType || null}::text IS NULL OR actor_type = ${params?.actorType || null});
  `;
  const total = parseInt(countResult[0]?.count || "0", 10);

  const events = await sql`
    SELECT a.id, a.event_type, a.actor_type, a.phone_e164, a.ip_address, a.metadata, a.created_at,
           adm.email as admin_email, adm.full_name as admin_name,
           c.customer_id as readable_customer_id, c.full_name as customer_name
    FROM audit_events a
    LEFT JOIN admin_users adm ON a.admin_id = adm.id
    LEFT JOIN customers c ON a.customer_id = c.id
    WHERE (${params?.eventType || null}::text IS NULL OR a.event_type = ${params?.eventType || null})
      AND (${params?.actorType || null}::text IS NULL OR a.actor_type = ${params?.actorType || null})
    ORDER BY a.created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  return { events, total };
}

// -----------------------------------------------------------------------------
// Dashboard Metrics (Real queries)
// -----------------------------------------------------------------------------

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const sql = getDirectSql();

  // 1. Total & Active customers
  const customerStats = await sql<{ total: string; active: string; new_7d: string }[]>`
    SELECT 
      count(*)::text as total,
      count(*) FILTER (WHERE onboarding_completed = true AND status = 'ACTIVE')::text as active,
      count(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text as new_7d
    FROM customers;
  `;

  // 2. Surveys
  const surveyStats = await sql<{ published: string; completed: string }[]>`
    SELECT 
      (SELECT count(*)::text FROM surveys WHERE status = 'PUBLISHED') as published,
      (SELECT count(*)::text FROM survey_responses WHERE status = 'COMPLETED') as completed;
  `;

  // 3. Rewards Coin Ledger
  const coinStats = await sql<{ issued: string; redeemed: string }[]>`
    SELECT 
      COALESCE(sum(amount) FILTER (WHERE amount > 0), 0)::text as issued,
      COALESCE(abs(sum(amount) FILTER (WHERE amount < 0)), 0)::text as redeemed
    FROM coin_transactions;
  `;

  // 4. Products & Trials
  const catalogStats = await sql<{ products: string; trials: string }[]>`
    SELECT 
      (SELECT count(*)::text FROM products) as products,
      (SELECT count(*)::text FROM trial_campaigns WHERE status = 'ACTIVE') as trials;
  `;

  // 5. Support tickets & Buildings
  const ticketStats = await sql<{ open_tickets: string }[]>`
    SELECT count(*)::text as open_tickets
    FROM support_tickets
    WHERE status IN ('OPEN', 'IN_PROGRESS');
  `;

  const buildingStats = await sql<{ count: string }[]>`
    SELECT count(*)::text as count FROM buildings;
  `;

  // 6. Recent audit events
  const recentEvents = await sql`
    SELECT id, event_type, actor_type, phone_e164, ip_address, created_at, metadata
    FROM audit_events
    ORDER BY created_at DESC
    LIMIT 8;
  `;

  return {
    totalCustomers: parseInt(customerStats[0]?.total || "0", 10),
    activeCustomers: parseInt(customerStats[0]?.active || "0", 10),
    newRegistrations7d: parseInt(customerStats[0]?.new_7d || "0", 10),
    surveysPublished: parseInt(surveyStats[0]?.published || "0", 10),
    surveysCompleted: parseInt(surveyStats[0]?.completed || "0", 10),
    coinsIssued: parseInt(coinStats[0]?.issued || "0", 10),
    coinsRedeemed: parseInt(coinStats[0]?.redeemed || "0", 10),
    totalProducts: parseInt(catalogStats[0]?.products || "0", 10),
    activeTrials: parseInt(catalogStats[0]?.trials || "0", 10),
    totalBuildings: parseInt(buildingStats[0]?.count || "0", 10),
    openTickets: parseInt(ticketStats[0]?.open_tickets || "0", 10),
    recentAuditEvents: recentEvents.map((r) => ({
      id: r.id,
      event_type: r.event_type,
      actor_type: r.actor_type || "CUSTOMER",
      phone_e164: r.phone_e164,
      ip_address: r.ip_address,
      created_at: r.created_at,
      metadata: r.metadata,
    })),
  };
}

// -----------------------------------------------------------------------------
// User Management
// -----------------------------------------------------------------------------

export async function listCustomersAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  onboarding?: string;
}): Promise<{ customers: any[]; total: number; page: number; limit: number }> {
  const sql = getDirectSql();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const searchQuery = params.search ? `%${params.search.trim().toLowerCase()}%` : null;
  const statusFilter = params.status && params.status !== "ALL" ? params.status : null;
  const onboardingFilter =
    params.onboarding === "COMPLETED"
      ? true
      : params.onboarding === "PENDING"
      ? false
      : null;

  const countRes = await sql<{ count: string }[]>`
    SELECT count(*)::text as count
    FROM customers
    WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter})
      AND (${onboardingFilter}::boolean IS NULL OR onboarding_completed = ${onboardingFilter})
      AND (
        ${searchQuery}::text IS NULL OR
        LOWER(customer_id) LIKE ${searchQuery} OR
        LOWER(COALESCE(full_name, '')) LIKE ${searchQuery} OR
        phone_e164 LIKE ${searchQuery}
      );
  `;
  const total = parseInt(countRes[0]?.count || "0", 10);

  const rows = await sql`
    SELECT 
      c.id, c.customer_id, c.phone_e164, c.full_name, c.display_name, c.city,
      c.onboarding_completed, c.status, c.reward_coins, c.created_at, c.updated_at,
      c.support_notes,
      (SELECT count(*)::int FROM survey_responses sr WHERE sr.customer_id = c.id) as surveys_count
    FROM customers c
    WHERE (${statusFilter}::text IS NULL OR c.status = ${statusFilter})
      AND (${onboardingFilter}::boolean IS NULL OR c.onboarding_completed = ${onboardingFilter})
      AND (
        ${searchQuery}::text IS NULL OR
        LOWER(c.customer_id) LIKE ${searchQuery} OR
        LOWER(COALESCE(c.full_name, '')) LIKE ${searchQuery} OR
        c.phone_e164 LIKE ${searchQuery}
      )
    ORDER BY c.created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  return { customers: rows, total, page, limit };
}

export async function getCustomerDetailAdmin(id: string): Promise<any | null> {
  const sql = getDirectSql();
  const rows = await sql`
    SELECT 
      c.id, c.customer_id, c.phone_e164, c.full_name, c.display_name, c.city,
      c.onboarding_completed, c.status, c.reward_coins, c.created_at, c.updated_at,
      c.support_notes, c.household_details, c.referral_code
    FROM customers c
    WHERE c.id = ${id} OR c.customer_id = ${id}
    LIMIT 1;
  `;

  if (rows.length === 0) return null;
  const customer = rows[0];

  // Load customer survey responses
  const surveys = await sql`
    SELECT sr.id, sr.survey_id, s.title as survey_title, sr.status, sr.reward_issued, sr.created_at, sr.answers
    FROM survey_responses sr
    LEFT JOIN surveys s ON sr.survey_id = s.id
    WHERE sr.customer_id = ${customer.id}
    ORDER BY sr.created_at DESC;
  `;

  // Load customer coin transactions
  const transactions = await sql`
    SELECT id, amount, type, description, idempotency_key, created_at
    FROM coin_transactions
    WHERE customer_id = ${customer.id}
    ORDER BY created_at DESC
    LIMIT 50;
  `;

  return {
    ...customer,
    surveys,
    transactions,
  };
}

export async function updateCustomerStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED" | "DELETED"
): Promise<void> {
  const sql = getDirectSql();
  await sql`
    UPDATE customers
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function updateCustomerAdminFields(
  id: string,
  data: {
    fullName?: string;
    city?: string;
    supportNotes?: string;
  }
): Promise<void> {
  const sql = getDirectSql();
  await sql`
    UPDATE customers
    SET 
      full_name = COALESCE(${data.fullName ? data.fullName.trim() : null}, full_name),
      city = COALESCE(${data.city ? data.city.trim() : null}, city),
      support_notes = COALESCE(${data.supportNotes !== undefined ? data.supportNotes : null}, support_notes),
      updated_at = NOW()
    WHERE id = ${id};
  `;
}

// -----------------------------------------------------------------------------
// Survey Management
// -----------------------------------------------------------------------------

export async function listSurveysAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT s.*,
           (SELECT count(*)::int FROM survey_questions sq WHERE sq.survey_id = s.id) as questions_count,
           (SELECT count(*)::int FROM survey_responses sr WHERE sr.survey_id = s.id AND sr.status = 'COMPLETED') as completions_count
    FROM surveys s
    ORDER BY s.created_at DESC;
  `;
}

export async function getSurveyByIdAdmin(id: string): Promise<any | null> {
  const sql = getDirectSql();
  const surveys = await sql`
    SELECT * FROM surveys WHERE id = ${id} OR survey_id = ${id} LIMIT 1;
  `;
  if (surveys.length === 0) return null;

  const survey = surveys[0];
  const questions = await sql`
    SELECT * FROM survey_questions WHERE survey_id = ${survey.id} ORDER BY order_num ASC;
  `;
  const responsesCount = await sql<{ count: string }[]>`
    SELECT count(*)::text as count FROM survey_responses WHERE survey_id = ${survey.id};
  `;

  return {
    ...survey,
    questions,
    total_responses: parseInt(responsesCount[0]?.count || "0", 10),
  };
}

export async function createSurveyAdmin(data: {
  surveyId: string;
  title: string;
  description?: string;
  category: string;
  language?: string;
  estimatedDurationMin: number;
  internalObjective?: string;
  sponsorDetails?: string;
  rewardCoins: number;
  responseQuota: number;
  adminId?: string;
}): Promise<any> {
  const sql = getDirectSql();
  const rows = await sql`
    INSERT INTO surveys (
      survey_id, title, description, category, language, 
      estimated_duration_min, internal_objective, sponsor_details,
      reward_coins, response_quota, status, version, created_by
    )
    VALUES (
      ${data.surveyId.trim()}, ${data.title.trim()}, ${data.description || null},
      ${data.category}, ${data.language || "en"}, ${data.estimatedDurationMin || 5},
      ${data.internalObjective || null}, ${data.sponsorDetails || null},
      ${data.rewardCoins || 50}, ${data.responseQuota || 500}, 'DRAFT', 1, ${data.adminId || null}
    )
    RETURNING *;
  `;
  return rows[0];
}

export async function updateSurveyStatusAdmin(
  id: string,
  newStatus: "DRAFT" | "TESTING" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED"
): Promise<any> {
  const sql = getDirectSql();
  const publishedAtClause = newStatus === "PUBLISHED" ? sql`published_at = COALESCE(published_at, NOW()),` : sql``;
  const rows = await sql`
    UPDATE surveys
    SET 
      status = ${newStatus},
      ${publishedAtClause}
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0];
}

export async function saveSurveyQuestionsAdmin(
  surveyId: string,
  questions: Array<{
    orderNum: number;
    questionText: string;
    questionType: string;
    options: string[];
    isRequired: boolean;
  }>
): Promise<void> {
  const sql = getDirectSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM survey_questions WHERE survey_id = ${surveyId};`;
    for (const q of questions) {
      await tx`
        INSERT INTO survey_questions (survey_id, order_num, question_text, question_type, options, is_required)
        VALUES (
          ${surveyId}, ${q.orderNum}, ${q.questionText.trim()}, ${q.questionType},
          ${JSON.stringify(q.options || [])}::jsonb, ${q.isRequired}
        );
      `;
    }
    await tx`UPDATE surveys SET version = version + 1, updated_at = NOW() WHERE id = ${surveyId};`;
  });
}

// -----------------------------------------------------------------------------
// Rewards & Coin Ledger
// -----------------------------------------------------------------------------

export async function listCoinLedgerAdmin(params?: {
  limit?: number;
  offset?: number;
  customerId?: string;
}): Promise<{ transactions: any[]; total: number }> {
  const sql = getDirectSql();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  const countRes = await sql<{ count: string }[]>`
    SELECT count(*)::text as count
    FROM coin_transactions
    WHERE (${params?.customerId || null}::uuid IS NULL OR customer_id = ${params?.customerId || null});
  `;
  const total = parseInt(countRes[0]?.count || "0", 10);

  const transactions = await sql`
    SELECT ct.*, c.customer_id as readable_customer_id, c.full_name as customer_name, c.phone_e164,
           adm.email as admin_email
    FROM coin_transactions ct
    JOIN customers c ON ct.customer_id = c.id
    LEFT JOIN admin_users adm ON ct.admin_id = adm.id
    WHERE (${params?.customerId || null}::uuid IS NULL OR ct.customer_id = ${params?.customerId || null})
    ORDER BY ct.created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  return { transactions, total };
}

export async function executeManualCoinAdjustment(data: {
  customerId: string;
  amount: number;
  reasonCode: string;
  description: string;
  adminId: string;
  idempotencyKey: string;
}): Promise<any> {
  const sql = getDirectSql();

  return await sql.begin(async (tx) => {
    // Check duplicate idempotency key
    const existing = await tx`
      SELECT id FROM coin_transactions WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1;
    `;
    if (existing.length > 0) {
      throw new Error(`Duplicate transaction detected with idempotency key ${data.idempotencyKey}`);
    }

    // Check customer exists
    const customers = await tx`
      SELECT id, reward_coins FROM customers WHERE id = ${data.customerId} FOR UPDATE;
    `;
    if (customers.length === 0) {
      throw new Error("Customer not found.");
    }
    const currentBalance = customers[0].reward_coins || 0;
    const newBalance = currentBalance + data.amount;

    if (newBalance < 0) {
      throw new Error(`Insufficient coin balance. Current: ${currentBalance}, adjustment: ${data.amount}`);
    }

    // Insert immutable transaction
    const txRow = await tx`
      INSERT INTO coin_transactions (
        customer_id, amount, type, description, idempotency_key, admin_id, metadata
      )
      VALUES (
        ${data.customerId}, ${data.amount}, 'MANUAL_ADJUSTMENT', ${data.description},
        ${data.idempotencyKey}, ${data.adminId}, ${JSON.stringify({ reasonCode: data.reasonCode })}::jsonb
      )
      RETURNING *;
    `;

    // Update customer cached balance
    await tx`
      UPDATE customers
      SET reward_coins = ${newBalance}, updated_at = NOW()
      WHERE id = ${data.customerId};
    `;

    return txRow[0];
  });
}

// -----------------------------------------------------------------------------
// Products and Scorecards
// -----------------------------------------------------------------------------

export async function listProductsAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT * FROM products ORDER BY created_at DESC;
  `;
}

export async function saveProductAdmin(data: {
  id?: string;
  title: string;
  category: string;
  brand: string;
  summary: string;
  specifications: Record<string, unknown>;
  priceInr: number;
  score?: number | null;
  scorecardDetails?: Record<string, unknown>;
  evidenceSources?: any[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}): Promise<any> {
  const sql = getDirectSql();
  if (data.id) {
    const rows = await sql`
      UPDATE products
      SET 
        title = ${data.title.trim()},
        category = ${data.category},
        brand = ${data.brand.trim()},
        summary = ${data.summary},
        specifications = ${JSON.stringify(data.specifications)}::jsonb,
        price_inr = ${data.priceInr},
        score = ${data.score !== undefined ? data.score : null},
        scorecard_details = ${JSON.stringify(data.scorecardDetails || {})}::jsonb,
        evidence_sources = ${JSON.stringify(data.evidenceSources || [])}::jsonb,
        status = ${data.status},
        updated_at = NOW()
      WHERE id = ${data.id}
      RETURNING *;
    `;
    return rows[0];
  } else {
    const rows = await sql`
      INSERT INTO products (
        title, category, brand, summary, specifications, price_inr, score, scorecard_details, evidence_sources, status
      )
      VALUES (
        ${data.title.trim()}, ${data.category}, ${data.brand.trim()}, ${data.summary},
        ${JSON.stringify(data.specifications)}::jsonb, ${data.priceInr}, ${data.score !== undefined ? data.score : null},
        ${JSON.stringify(data.scorecardDetails || {})}::jsonb, ${JSON.stringify(data.evidenceSources || [])}::jsonb, ${data.status}
      )
      RETURNING *;
    `;
    return rows[0];
  }
}

// -----------------------------------------------------------------------------
// Store & Trials
// -----------------------------------------------------------------------------

export async function listTrialsAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT t.*, p.title as product_title, p.brand as product_brand
    FROM trial_campaigns t
    LEFT JOIN products p ON t.product_id = p.id
    ORDER BY t.created_at DESC;
  `;
}

export async function saveTrialAdmin(data: {
  id?: string;
  title: string;
  description: string;
  productId?: string | null;
  coinCost: number;
  inventoryStock: number;
  status: "ACTIVE" | "PAUSED" | "EXHAUSTED" | "CLOSED";
  partnerName?: string;
}): Promise<any> {
  const sql = getDirectSql();
  if (data.id) {
    const rows = await sql`
      UPDATE trial_campaigns
      SET 
        title = ${data.title.trim()},
        description = ${data.description},
        product_id = ${data.productId || null},
        coin_cost = ${data.coinCost},
        inventory_stock = ${data.inventoryStock},
        status = ${data.status},
        partner_name = ${data.partnerName || null},
        updated_at = NOW()
      WHERE id = ${data.id}
      RETURNING *;
    `;
    return rows[0];
  } else {
    const rows = await sql`
      INSERT INTO trial_campaigns (
        title, description, product_id, coin_cost, inventory_stock, status, partner_name
      )
      VALUES (
        ${data.title.trim()}, ${data.description}, ${data.productId || null},
        ${data.coinCost}, ${data.inventoryStock}, ${data.status}, ${data.partnerName || null}
      )
      RETURNING *;
    `;
    return rows[0];
  }
}

// -----------------------------------------------------------------------------
// Referrals
// -----------------------------------------------------------------------------

export async function listReferralsAdmin(filter?: { status?: string; search?: string }): Promise<any[]> {
  const sql = getDirectSql();
  const searchPattern = filter?.search ? `%${filter.search.trim().toLowerCase()}%` : null;
  const statusFilter = filter?.status && filter.status !== "ALL" ? filter.status : null;

  return await sql`
    SELECT 
      ra.*,
      ref.customer_id as referrer_customer_id, ref.full_name as referrer_name, ref.phone_e164 as referrer_phone,
      rec.customer_id as referee_customer_id, rec.full_name as referee_name, rec.phone_e164 as referee_phone
    FROM referral_attributions ra
    JOIN customers ref ON ra.referrer_id = ref.id
    JOIN customers rec ON ra.referee_id = rec.id
    WHERE (${statusFilter}::text IS NULL OR ra.status = ${statusFilter})
      AND (${searchPattern}::text IS NULL OR (
        LOWER(ra.referral_code) LIKE ${searchPattern}
        OR LOWER(ref.customer_id) LIKE ${searchPattern}
        OR LOWER(COALESCE(ref.full_name, '')) LIKE ${searchPattern}
        OR ref.phone_e164 LIKE ${searchPattern}
        OR LOWER(rec.customer_id) LIKE ${searchPattern}
        OR LOWER(COALESCE(rec.full_name, '')) LIKE ${searchPattern}
        OR rec.phone_e164 LIKE ${searchPattern}
      ))
    ORDER BY ra.created_at DESC;
  `;
}

export async function updateReferralStatusAdmin(
  id: string,
  status: "PENDING" | "QUALIFIED" | "REWARDED" | "REJECTED",
  rejectionReason?: string,
  adminId?: string
): Promise<any> {
  const sql = getDirectSql();
  if (status === "REWARDED") {
    await executeReferralReward(id, adminId);
    const rows = await sql`SELECT * FROM referral_attributions WHERE id = ${id}`;
    return rows[0];
  }

  const rows = await sql`
    UPDATE referral_attributions
    SET 
      status = ${status}, 
      qualified_at = CASE WHEN ${status} = 'QUALIFIED' THEN NOW() ELSE qualified_at END,
      rejection_reason = CASE WHEN ${status} = 'REJECTED' THEN ${rejectionReason || 'Rejected by administrator'} ELSE rejection_reason END
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0];
}

// -----------------------------------------------------------------------------
// Building Intelligence
// -----------------------------------------------------------------------------

export async function listBuildingsAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT b.*,
           (SELECT count(*)::int FROM building_observations bo WHERE bo.building_id = b.id) as observations_count
    FROM buildings b
    ORDER BY b.created_at DESC;
  `;
}

export async function saveBuildingAdmin(data: {
  id?: string;
  name: string;
  pincode: string;
  city: string;
  locality: string;
  totalUnits?: number;
  waterSource?: string;
  avgTds?: number;
}): Promise<any> {
  const sql = getDirectSql();
  if (data.id) {
    const rows = await sql`
      UPDATE buildings
      SET 
        name = ${data.name.trim()},
        pincode = ${data.pincode.trim()},
        city = ${data.city.trim()},
        locality = ${data.locality.trim()},
        total_units = ${data.totalUnits || null},
        water_source = ${data.waterSource || null},
        avg_tds = ${data.avgTds || null}
      WHERE id = ${data.id}
      RETURNING *;
    `;
    return rows[0];
  } else {
    const rows = await sql`
      INSERT INTO buildings (name, pincode, city, locality, total_units, water_source, avg_tds)
      VALUES (${data.name.trim()}, ${data.pincode.trim()}, ${data.city.trim()}, ${data.locality.trim()}, ${data.totalUnits || null}, ${data.waterSource || null}, ${data.avgTds || null})
      RETURNING *;
    `;
    return rows[0];
  }
}

export async function listObservationsAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT bo.*, b.name as building_name, b.city, b.locality, c.customer_id as reporter_id
    FROM building_observations bo
    JOIN buildings b ON bo.building_id = b.id
    LEFT JOIN customers c ON bo.customer_id = c.id
    ORDER BY bo.created_at DESC;
  `;
}

export async function moderateObservationAdmin(
  id: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
): Promise<any> {
  const sql = getDirectSql();
  const rows = await sql`
    UPDATE building_observations
    SET moderation_status = ${status}, rejection_reason = ${rejectionReason || null}
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0];
}

// -----------------------------------------------------------------------------
// Communications & Notifications
// -----------------------------------------------------------------------------

export async function listNotificationCampaignsAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT nc.*, adm.email as created_by_email
    FROM notification_campaigns nc
    LEFT JOIN admin_users adm ON nc.created_by = adm.id
    ORDER BY nc.created_at DESC;
  `;
}

export async function createNotificationCampaignAdmin(data: {
  title: string;
  channel: "WHATSAPP" | "IN_APP" | "SMS";
  templateName: string;
  bodyText: string;
  targetFilter?: Record<string, unknown>;
  adminId?: string;
}): Promise<any> {
  const sql = getDirectSql();
  const rows = await sql`
    INSERT INTO notification_campaigns (title, channel, template_name, body_text, target_filter, status, created_by)
    VALUES (
      ${data.title.trim()}, ${data.channel}, ${data.templateName.trim()},
      ${data.bodyText}, ${JSON.stringify(data.targetFilter || {})}::jsonb, 'DRAFT', ${data.adminId || null}
    )
    RETURNING *;
  `;
  return rows[0];
}

export async function executeNotificationSendAdmin(id: string): Promise<any> {
  const sql = getDirectSql();
  // Count targeted eligible customers
  const countRes = await sql<{ count: string }[]>`
    SELECT count(*)::text as count FROM customers WHERE status = 'ACTIVE';
  `;
  const sentCount = parseInt(countRes[0]?.count || "0", 10);

  const rows = await sql`
    UPDATE notification_campaigns
    SET status = 'SENT', sent_count = ${sentCount}
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0];
}

// -----------------------------------------------------------------------------
// Support Tickets
// -----------------------------------------------------------------------------

export async function listSupportTicketsAdmin(): Promise<any[]> {
  const sql = getDirectSql();
  return await sql`
    SELECT st.*, c.customer_id as readable_customer_id, c.full_name as customer_name, c.phone_e164,
           adm.full_name as assigned_to_name
    FROM support_tickets st
    JOIN customers c ON st.customer_id = c.id
    LEFT JOIN admin_users adm ON st.assigned_to = adm.id
    ORDER BY st.created_at DESC;
  `;
}

export async function saveSupportTicketAdmin(data: {
  id?: string;
  ticketNumber?: string;
  customerId?: string;
  subject: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedTo?: string | null;
  note?: string;
  adminEmail?: string;
}): Promise<any> {
  const sql = getDirectSql();

  if (data.id) {
    const existing = await sql`SELECT notes FROM support_tickets WHERE id = ${data.id}`;
    const notes = existing[0]?.notes || [];
    if (data.note) {
      notes.push({
        text: data.note,
        by: data.adminEmail || "Admin",
        at: new Date().toISOString(),
      });
    }

    const rows = await sql`
      UPDATE support_tickets
      SET 
        subject = ${data.subject.trim()},
        category = ${data.category},
        priority = ${data.priority},
        status = ${data.status},
        assigned_to = ${data.assignedTo || null},
        notes = ${JSON.stringify(notes)}::jsonb,
        updated_at = NOW()
      WHERE id = ${data.id}
      RETURNING *;
    `;
    return rows[0];
  } else {
    const ticketNum = data.ticketNumber || `TICK-${Date.now().toString().slice(-6)}`;
    const initialNotes = data.note ? [{ text: data.note, by: data.adminEmail || "Admin", at: new Date().toISOString() }] : [];
    const rows = await sql`
      INSERT INTO support_tickets (ticket_number, customer_id, subject, category, priority, status, assigned_to, notes)
      VALUES (
        ${ticketNum}, ${data.customerId || null}, ${data.subject.trim()}, ${data.category},
        ${data.priority}, ${data.status}, ${data.assignedTo || null}, ${JSON.stringify(initialNotes)}::jsonb
      )
      RETURNING *;
    `;
    return rows[0];
  }
}

// -----------------------------------------------------------------------------
// System Settings
// -----------------------------------------------------------------------------

export async function getSystemSettingsAdmin(): Promise<Record<string, any>> {
  const sql = getDirectSql();
  const rows = await sql<{ key: string; value: any }[]>`
    SELECT key, value FROM system_settings;
  `;
  const result: Record<string, any> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

export async function updateSystemSettingAdmin(
  key: string,
  value: any,
  adminId: string
): Promise<void> {
  const sql = getDirectSql();
  await sql`
    INSERT INTO system_settings (key, value, updated_by, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${adminId}, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = ${JSON.stringify(value)}::jsonb, updated_by = ${adminId}, updated_at = NOW();
  `;
}
