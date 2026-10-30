import { getDirectSql, isDirectDatabaseConfigured } from "./supabase/direct-db";
import { AdminRole } from "./admin-auth";
import { executeReferralReward } from "./referral";
import { validateSurveyDefinition, SurveyQuestion } from "./survey-engine";
import { adminInMemoryStore } from "./admin-memory-store";
import { dummySurveyStore } from "./dummy-surveys";

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
  pendingSubmissions?: number;
  pollResponses?: number;
  ordersPlaced?: number;
  vouchersUnlocked?: number;
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
  const cleanEmail = email.trim().toLowerCase();
  const configuredEmail = (process.env.ADMIN_INITIAL_EMAIL || "admin@gharsure.com").trim().toLowerCase();

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      let rows = await sql<AdminUserRecord[]>`
        SELECT id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at
        FROM admin_users
        WHERE LOWER(email) = LOWER(${cleanEmail})
        LIMIT 1;
      `;
      if ((!rows || rows.length === 0) && cleanEmail === configuredEmail) {
        rows = await sql<AdminUserRecord[]>`
          SELECT id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at
          FROM admin_users
          WHERE role = 'SUPER_ADMIN'
          LIMIT 1;
        `;
      }
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in getAdminByEmail, using in-memory store:", (err as Error).message);
    }
  }

  return adminInMemoryStore.getAdminByEmail(cleanEmail);
}

export async function getAdminById(id: string): Promise<AdminUserRecord | null> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<AdminUserRecord[]>`
        SELECT id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at
        FROM admin_users
        WHERE id = ${id}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in getAdminById, using in-memory store:", (err as Error).message);
    }
  }

  return adminInMemoryStore.getAdminById(id);
}

export async function recordAdminLogin(id: string): Promise<void> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`
        UPDATE admin_users
        SET last_login_at = NOW(), updated_at = NOW()
        WHERE id = ${id};
      `;
    } catch (err) {
      console.warn("[AdminDB] DB error in recordAdminLogin, updating in-memory store:", (err as Error).message);
    }
  }
  adminInMemoryStore.recordLogin(id);
}

export async function listAdmins(): Promise<Omit<AdminUserRecord, "password_hash">[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<Omit<AdminUserRecord, "password_hash">[]>`
        SELECT id, email, full_name, role, status, permissions, invited_by, created_at, updated_at, last_login_at
        FROM admin_users
        ORDER BY created_at ASC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error in listAdmins, using in-memory store:", (err as Error).message);
    }
  }
  return adminInMemoryStore.listAdmins();
}

export async function countActiveSuperAdmins(): Promise<number> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<{ count: string }[]>`
        SELECT count(*)::text as count
        FROM admin_users
        WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE';
      `;
      if (rows && rows[0]?.count) return parseInt(rows[0].count, 10);
    } catch (err) {
      console.warn("[AdminDB] DB error in countActiveSuperAdmins:", (err as Error).message);
    }
  }
  return adminInMemoryStore.countActiveSuperAdmins();
}

export async function createAdminUser(data: {
  email: string;
  fullName: string;
  passwordHash: string;
  role: AdminRole;
  invitedBy?: string;
}): Promise<AdminUserRecord> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<AdminUserRecord[]>`
        INSERT INTO admin_users (email, full_name, password_hash, role, status, invited_by)
        VALUES (${data.email.toLowerCase().trim()}, ${data.fullName.trim()}, ${data.passwordHash}, ${data.role}, 'ACTIVE', ${data.invitedBy || null})
        RETURNING id, email, full_name, password_hash, role, status, permissions, invited_by, created_at, updated_at, last_login_at;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in createAdminUser, storing in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.createAdmin(data);
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

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
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
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in updateAdminUser, updating in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.updateAdmin(id, data);
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
  adminInMemoryStore.logAuditEvent(data);

  if (isDirectDatabaseConfigured()) {
    try {
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
      console.warn("[AdminDB] DB error logging audit event:", (err as Error).message);
    }
  }
}

export async function listAuditEvents(params?: {
  limit?: number;
  offset?: number;
  eventType?: string;
  actorType?: string;
}): Promise<{ events: any[]; total: number }> {
  if (isDirectDatabaseConfigured()) {
    try {
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
    } catch (err) {
      console.warn("[AdminDB] DB error listing audit events, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.listAuditEvents(params);
}

// -----------------------------------------------------------------------------
// Dashboard Metrics
// -----------------------------------------------------------------------------

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (isDirectDatabaseConfigured()) {
    try {
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

      // 5. Support tickets, Submissions, Orders & Polls
      const activityStats = await sql<{
        open_tickets: string;
        pending_submissions: string;
        poll_responses: string;
        orders_placed: string;
        vouchers_unlocked: string;
      }[]>`
        SELECT 
          (SELECT count(*)::text FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')) as open_tickets,
          (SELECT count(*)::text FROM file_submissions WHERE status = 'SUBMITTED') as pending_submissions,
          (SELECT count(*)::text FROM quick_poll_responses) as poll_responses,
          (SELECT count(*)::text FROM orders) as orders_placed,
          (SELECT count(*)::text FROM customer_vouchers WHERE status = 'UNLOCKED') as vouchers_unlocked;
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
        openTickets: parseInt(activityStats[0]?.open_tickets || "0", 10),
        pendingSubmissions: parseInt(activityStats[0]?.pending_submissions || "0", 10),
        pollResponses: parseInt(activityStats[0]?.poll_responses || "0", 10),
        ordersPlaced: parseInt(activityStats[0]?.orders_placed || "0", 10),
        vouchersUnlocked: parseInt(activityStats[0]?.vouchers_unlocked || "0", 10),
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
    } catch (err) {
      console.warn("[AdminDB] DB error getting dashboard metrics, using in-memory store:", (err as Error).message);
    }
  }

  return adminInMemoryStore.getDashboardMetrics();
}

// -----------------------------------------------------------------------------
// User Management
// -----------------------------------------------------------------------------

export async function listCustomersAdmin(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  onboarding?: string;
}): Promise<{ customers: any[]; total: number; page: number; limit: number }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const page = Math.max(1, params?.page || 1);
      const limit = Math.min(100, Math.max(1, params?.limit || 20));
      const offset = (page - 1) * limit;

      const searchQuery = params?.search ? `%${params.search.trim().toLowerCase()}%` : null;
      const statusFilter = params?.status && params.status !== "ALL" ? params.status : null;
      const onboardingFilter =
        params?.onboarding === "COMPLETED"
          ? true
          : params?.onboarding === "PENDING"
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
    } catch (err) {
      console.warn("[AdminDB] DB error in listCustomersAdmin, using in-memory store:", (err as Error).message);
    }
  }

  return adminInMemoryStore.listCustomers(params);
}

export async function getCustomerDetailAdmin(id: string): Promise<any | null> {
  if (isDirectDatabaseConfigured()) {
    try {
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

      if (rows && rows.length > 0) {
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
    } catch (err) {
      console.warn("[AdminDB] DB error in getCustomerDetailAdmin:", (err as Error).message);
    }
  }

  return adminInMemoryStore.getCustomerDetail(id);
}

export async function updateCustomerStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED" | "DELETED"
): Promise<void> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`
        UPDATE customers
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id};
      `;
    } catch (err) {
      console.warn("[AdminDB] DB error in updateCustomerStatus:", (err as Error).message);
    }
  }
  adminInMemoryStore.updateCustomerStatus(id, status);
}

export async function updateCustomerAdminFields(
  id: string,
  data: {
    fullName?: string;
    city?: string;
    supportNotes?: string;
  }
): Promise<void> {
  if (isDirectDatabaseConfigured()) {
    try {
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
    } catch (err) {
      console.warn("[AdminDB] DB error in updateCustomerAdminFields:", (err as Error).message);
    }
  }
  adminInMemoryStore.updateCustomerFields(id, data);
}

// -----------------------------------------------------------------------------
// Survey Management
// -----------------------------------------------------------------------------

export async function listSurveysAdmin(params?: {
  type?: string;
  status?: string;
  search?: string;
}): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const searchPattern = params?.search ? `%${params.search.trim().toLowerCase()}%` : null;
      const statusFilter = params?.status && params.status !== "ALL" ? params.status : null;
      const typeFilter = params?.type && params.type !== "ALL" ? params.type : null;

      const rows = await sql`
        SELECT s.*,
               (SELECT count(*)::int FROM survey_questions sq WHERE sq.survey_id = s.id) as questions_count,
               (SELECT count(*)::int FROM survey_responses sr WHERE sr.survey_id = s.id AND sr.status = 'COMPLETED') as completions_count,
               (SELECT count(*)::int FROM survey_responses sr WHERE sr.survey_id = s.id AND sr.status IN ('STARTED', 'IN_PROGRESS')) as in_progress_count
        FROM surveys s
        WHERE (${statusFilter}::text IS NULL OR s.status = ${statusFilter})
          AND (${typeFilter}::text IS NULL OR s.survey_type = ${typeFilter})
          AND (${searchPattern}::text IS NULL OR (
            LOWER(s.title) LIKE ${searchPattern}
            OR LOWER(s.survey_id) LIKE ${searchPattern}
            OR LOWER(s.category) LIKE ${searchPattern}
          ))
        ORDER BY s.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error in listSurveysAdmin, falling back to dummy store:", (err as Error).message);
    }
  }

  return dummySurveyStore.listAdminSurveys(params);
}

export async function getSurveyByIdAdmin(id: string): Promise<any | null> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const surveys = await sql`
        SELECT * FROM surveys WHERE id::text = ${id} OR survey_id = ${id} LIMIT 1;
      `;
      if (surveys && surveys.length > 0) {
        const survey = surveys[0];
        const rawQuestions = await sql`
          SELECT id, survey_id, order_num, question_text, question_type,
                 description, options, is_required, validation_rules,
                 branching_rules, section_name
          FROM survey_questions
          WHERE survey_id = ${survey.id}
          ORDER BY order_num ASC;
        `;

        const questions = rawQuestions.map((q: any) => ({
          ...q,
          orderNum: q.order_num || q.orderNum,
          questionText: q.question_text || q.questionText || "",
          questionType: q.question_type || q.questionType || "SINGLE_CHOICE",
          isRequired: q.is_required !== undefined ? q.is_required : q.isRequired !== false,
          validationRules: q.validation_rules || q.validationRules || {},
          branchingRules: q.branching_rules || q.branchingRules || [],
          sectionName: q.section_name || q.sectionName || null,
        }));

        const versions = await sql`
          SELECT id, version_num, reward_coins, published_at
          FROM survey_versions
          WHERE survey_id = ${survey.id}
          ORDER BY version_num DESC;
        `;

        const counts = await sql`
          SELECT 
            count(*)::int as total_responses,
            count(*) FILTER (WHERE status = 'COMPLETED')::int as completions,
            count(*) FILTER (WHERE status IN ('STARTED', 'IN_PROGRESS'))::int as in_progress,
            count(*) FILTER (WHERE status = 'DISQUALIFIED')::int as disqualified
          FROM survey_responses
          WHERE survey_id = ${survey.id};
        `;

        return {
          ...survey,
          questions,
          versions,
          counts: counts[0] || { total_responses: 0, completions: 0, in_progress: 0, disqualified: 0 },
        };
      }
    } catch (err) {
      console.warn("[AdminDB] DB error in getSurveyByIdAdmin, falling back to dummy store:", (err as Error).message);
    }
  }

  const s = dummySurveyStore.getSurvey(id);
  if (!s) return null;
  return {
    ...s,
    questions: s.questions,
    versions: [
      {
        id: `ver-${s.id}`,
        version_num: s.version || 1,
        reward_coins: s.reward_coins,
        published_at: s.published_at || s.updated_at,
      },
    ],
    counts: {
      total_responses: s.responses_count + 12,
      completions: s.responses_count,
      in_progress: 12,
      disqualified: 0,
    },
  };
}

export async function createSurveyAdmin(data: {
  surveyId: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  surveyType?: "STATIC" | "DECISION_BASED";
  category: string;
  language?: string;
  estimatedDurationMin: number;
  internalObjective?: string;
  sponsorDetails?: string;
  rewardCoins: number;
  responseQuota: number;
  allowResume?: boolean;
  allowReview?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  eligibilityRules?: any;
  adminId?: string;
}): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        INSERT INTO surveys (
          survey_id, title, description, image_url, survey_type, category, language, 
          estimated_duration_min, internal_objective, sponsor_details,
          reward_coins, response_quota, allow_resume, allow_review,
          start_date, end_date, eligibility_rules, status, version, created_by
        )
        VALUES (
          ${data.surveyId.trim()}, ${data.title.trim()}, ${data.description || null}, ${data.imageUrl || null},
          ${data.surveyType || "STATIC"}, ${data.category}, ${data.language || "en"},
          ${data.estimatedDurationMin || 5}, ${data.internalObjective || null}, ${data.sponsorDetails || null},
          ${data.rewardCoins ?? 50}, ${data.responseQuota || 500},
          ${data.allowResume !== false}, ${data.allowReview === true},
          ${data.startDate || null}, ${data.endDate || null},
          ${JSON.stringify(data.eligibilityRules || {})}::jsonb,
          'DRAFT', 1, ${data.adminId || null}
        )
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in createSurveyAdmin, creating in dummy store:", (err as Error).message);
    }
  }

  return dummySurveyStore.createSurvey(data);
}

export async function updateSurveyDetailsAdmin(
  id: string,
  data: {
    title?: string;
    description?: string;
    imageUrl?: string | null;
    surveyType?: "STATIC" | "DECISION_BASED";
    category?: string;
    estimatedDurationMin?: number;
    rewardCoins?: number;
    responseQuota?: number;
    allowResume?: boolean;
    allowReview?: boolean;
  }
): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE surveys
        SET 
          title = COALESCE(${data.title?.trim() || null}, title),
          description = COALESCE(${data.description || null}, description),
          image_url = COALESCE(${data.imageUrl !== undefined ? data.imageUrl : null}, image_url),
          survey_type = COALESCE(${data.surveyType || null}, survey_type),
          category = COALESCE(${data.category || null}, category),
          estimated_duration_min = COALESCE(${data.estimatedDurationMin || null}, estimated_duration_min),
          reward_coins = COALESCE(${data.rewardCoins !== undefined ? data.rewardCoins : null}, reward_coins),
          response_quota = COALESCE(${data.responseQuota || null}, response_quota),
          allow_resume = COALESCE(${data.allowResume !== undefined ? data.allowResume : null}, allow_resume),
          allow_review = COALESCE(${data.allowReview !== undefined ? data.allowReview : null}, allow_review),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in updateSurveyDetailsAdmin:", (err as Error).message);
    }
  }

  return dummySurveyStore.updateSurvey(id, data as any);
}

export async function updateSurveyStatusAdmin(
  id: string,
  newStatus: "DRAFT" | "TESTING" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED",
  adminId?: string
): Promise<any> {
  if (newStatus === "PUBLISHED") {
    return await publishSurveyAdmin(id, adminId);
  }

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE surveys
        SET 
          status = ${newStatus},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error in updateSurveyStatusAdmin:", (err as Error).message);
    }
  }

  return dummySurveyStore.updateSurveyStatus(id, newStatus);
}

export async function saveSurveyQuestionsAdmin(
  surveyId: string,
  questions: Array<{
    id?: string;
    orderNum?: number;
    order_num?: number;
    questionText?: string;
    question_text?: string;
    questionType?: string;
    question_type?: string;
    description?: string | null;
    options?: any;
    isRequired?: boolean;
    is_required?: boolean;
    validationRules?: any;
    validation_rules?: any;
    branchingRules?: any[];
    branching_rules?: any[];
    sectionName?: string | null;
    section_name?: string | null;
  }>
): Promise<void> {
  const isUuid = (val?: string): boolean =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql.begin(async (tx) => {
        // 1. Safely resolve survey UUID
        const matching = await tx<{ id: string }[]>`
          SELECT id FROM surveys WHERE id::text = ${surveyId} OR survey_id = ${surveyId} LIMIT 1;
        `;
        const targetSurveyUuid = matching[0]?.id || surveyId;

        // 2. Clear existing questions for this survey
        await tx`DELETE FROM survey_questions WHERE survey_id = ${targetSurveyUuid};`;

        // 3. Map any non-UUID question IDs (e.g. q-123456) to valid UUIDs
        const idMap = new Map<string, string>();
        for (const q of questions) {
          const rawId = q.id;
          const validUuid = isUuid(rawId) ? rawId! : crypto.randomUUID();
          if (rawId) idMap.set(rawId, validUuid);
        }

        // 4. Insert normalized questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const rawId = q.id;
          const qId = (rawId && idMap.get(rawId)) || crypto.randomUUID();
          const orderNum = q.orderNum || q.order_num || (i + 1);
          const qText = (q.questionText || q.question_text || "").trim();
          const qType = q.questionType || q.question_type || "SINGLE_CHOICE";
          const desc = q.description?.trim() || null;
          const isReq = q.isRequired !== undefined ? q.isRequired : q.is_required !== false;
          const valRules = q.validationRules || q.validation_rules || {};
          let branchRules = q.branchingRules || q.branching_rules || [];

          // Remap targetQuestionId in branching rules if referencing mapped IDs
          if (Array.isArray(branchRules)) {
            branchRules = branchRules.map((r: any) => {
              if (r.targetQuestionId && idMap.has(r.targetQuestionId)) {
                return { ...r, targetQuestionId: idMap.get(r.targetQuestionId) };
              }
              return r;
            });
          }

          await tx`
            INSERT INTO survey_questions (
              id, survey_id, order_num, question_text, question_type,
              description, options, is_required, validation_rules,
              branching_rules, section_name
            )
            VALUES (
              ${qId}, ${targetSurveyUuid}, ${orderNum}, ${qText}, ${qType},
              ${desc}, ${JSON.stringify(q.options || [])}::jsonb, ${isReq},
              ${JSON.stringify(valRules)}::jsonb,
              ${JSON.stringify(branchRules)}::jsonb,
              ${q.sectionName || q.section_name || null}
            );
          `;
        }
        await tx`UPDATE surveys SET version = version + 1, updated_at = NOW() WHERE id = ${targetSurveyUuid};`;
      });
      return;
    } catch (err) {
      console.error("[AdminDB] DB error in saveSurveyQuestionsAdmin:", (err as Error).message);
      throw err;
    }
  }

  dummySurveyStore.saveSurveyQuestions(surveyId, questions as any);
}

export async function publishSurveyAdmin(surveyId: string, adminId?: string): Promise<any> {
  const survey = await getSurveyByIdAdmin(surveyId);
  if (!survey) throw new Error("Survey not found.");

  // Normalize questions for engine validation
  const normalizedQuestions: SurveyQuestion[] = (survey.questions || []).map((q: any) => ({
    id: q.id,
    surveyId: q.survey_id || survey.id,
    orderNum: q.order_num || q.orderNum || 1,
    questionText: q.question_text || q.questionText || "",
    questionType: q.question_type || q.questionType || "SINGLE_CHOICE",
    description: q.description || null,
    options: q.options || [],
    isRequired: q.is_required !== undefined ? q.is_required : q.isRequired !== false,
    validationRules: q.validation_rules || q.validationRules || {},
    branchingRules: q.branching_rules || q.branchingRules || [],
    sectionName: q.section_name || q.sectionName || null,
  }));

  // Pre-flight validation using Survey Engine
  const validation = validateSurveyDefinition(normalizedQuestions, survey.survey_type || "STATIC");
  if (!validation.isValid) {
    throw new Error(`Cannot publish survey due to validation errors: ${validation.errors.join("; ")}`);
  }

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx) => {
        const versionNum = (survey.version || 1);
        const snapshot = {
          survey_id: survey.survey_id,
          title: survey.title,
          description: survey.description,
          survey_type: survey.survey_type,
          category: survey.category,
          estimated_duration_min: survey.estimated_duration_min,
          reward_coins: survey.reward_coins,
          questions: normalizedQuestions,
          published_at: new Date().toISOString(),
        };

        const [versionRow] = await tx`
          INSERT INTO survey_versions (
            survey_id, version_num, snapshot, reward_coins, published_by
          )
          VALUES (
            ${survey.id}, ${versionNum}, ${JSON.stringify(snapshot)}::jsonb,
            ${survey.reward_coins}, ${adminId || null}
          )
          ON CONFLICT (survey_id, version_num) DO UPDATE
          SET snapshot = EXCLUDED.snapshot, reward_coins = EXCLUDED.reward_coins, published_at = NOW()
          RETURNING *;
        `;

        const [updatedSurvey] = await tx`
          UPDATE surveys
          SET status = 'PUBLISHED', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
          WHERE id = ${survey.id}
          RETURNING *;
        `;

        return { ...updatedSurvey, versionSnapshotId: versionRow?.id };
      });
    } catch (err) {
      console.error("[AdminDB] DB error publishing survey:", (err as Error).message);
      throw err;
    }
  }

  const updated = dummySurveyStore.updateSurveyStatus(surveyId, "PUBLISHED");
  return { ...updated, versionSnapshotId: `ver-${surveyId}` };
}

export async function duplicateSurveyAdmin(surveyId: string, adminId?: string): Promise<any> {
  const original = await getSurveyByIdAdmin(surveyId);
  if (!original) throw new Error("Original survey not found.");

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const newSlug = `${original.survey_id}-copy-${Date.now().toString(36).slice(-4)}`;
      const newTitle = `${original.title} (Copy)`;

      return await sql.begin(async (tx) => {
        const [cloned] = await tx`
          INSERT INTO surveys (
            survey_id, title, description, survey_type, category, language,
            estimated_duration_min, internal_objective, sponsor_details,
            reward_coins, response_quota, allow_resume, allow_review,
            status, version, created_by
          )
          VALUES (
            ${newSlug}, ${newTitle}, ${original.description}, ${original.survey_type || "STATIC"},
            ${original.category}, ${original.language || "en"}, ${original.estimated_duration_min},
            ${original.internalObjective || null}, ${original.sponsorDetails || null},
            ${original.reward_coins}, ${original.response_quota},
            ${original.allow_resume !== false}, ${original.allow_review === true},
            'DRAFT', 1, ${adminId || null}
          )
          RETURNING *;
        `;

        for (const q of original.questions) {
          const newQId = crypto.randomUUID();
          await tx`
            INSERT INTO survey_questions (
              id, survey_id, order_num, question_text, question_type,
              description, options, is_required, validation_rules,
              branching_rules, section_name
            )
            VALUES (
              ${newQId}, ${cloned.id}, ${q.order_num}, ${q.question_text}, ${q.question_type},
              ${q.description}, ${JSON.stringify(q.options || [])}::jsonb, ${q.is_required},
              ${JSON.stringify(q.validation_rules || {})}::jsonb,
              ${JSON.stringify(q.branching_rules || [])}::jsonb,
              ${q.section_name}
            );
          `;
        }

        return cloned;
      });
    } catch (err) {
      console.warn("[AdminDB] DB error duplicating survey, duplicating in dummy store:", (err as Error).message);
    }
  }

  return dummySurveyStore.duplicateSurvey(surveyId);
}

export async function deleteSurveyAdmin(surveyId: string): Promise<void> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql.begin(async (tx) => {
        await tx`DELETE FROM survey_responses WHERE survey_id = ${surveyId};`;
        await tx`DELETE FROM survey_questions WHERE survey_id = ${surveyId};`;
        await tx`DELETE FROM survey_versions WHERE survey_id = ${surveyId};`;
        await tx`DELETE FROM surveys WHERE id = ${surveyId};`;
      });
      return;
    } catch (err) {
      console.warn("[AdminDB] DB error deleting survey:", (err as Error).message);
    }
  }

  dummySurveyStore.deleteSurvey(surveyId);
}

export async function getSurveyResponsesAdmin(
  surveyId: string,
  params?: { limit?: number; offset?: number; status?: string }
): Promise<{ responses: any[]; total: number }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const limit = params?.limit || 50;
      const offset = params?.offset || 0;
      const statusFilter = params?.status && params.status !== "ALL" ? params.status : null;

      // Safely resolve survey UUID whether surveyId is a UUID or slug (e.g. SURV-EXPERIENCE-01)
      const matching = await sql<{ id: string }[]>`
        SELECT id FROM surveys WHERE id::text = ${surveyId} OR survey_id = ${surveyId} LIMIT 1;
      `;
      const targetUuid = matching[0]?.id || surveyId;

      const countRows = await sql<{ count: string }[]>`
        SELECT count(*)::text as count
        FROM survey_responses sr
        WHERE sr.survey_id::text = ${targetUuid}
          AND (${statusFilter}::text IS NULL OR sr.status = ${statusFilter});
      `;
      const total = parseInt(countRows[0]?.count || "0", 10);

      const rawQuestions = await sql`
        SELECT id, order_num, question_text, question_type, options
        FROM survey_questions
        WHERE survey_id::text = ${targetUuid}
        ORDER BY order_num ASC;
      `;

      const rawResponses = await sql`
        SELECT sr.*,
               c.customer_id as customer_readable_id, c.full_name as customer_name, c.phone_e164, c.city as customer_city
        FROM survey_responses sr
        JOIN customers c ON sr.customer_id = c.id
        WHERE sr.survey_id::text = ${targetUuid}
          AND (${statusFilter}::text IS NULL OR sr.status = ${statusFilter})
        ORDER BY sr.created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      const responses = rawResponses.map((sr: any) => {
        let answersObj: Record<string, any> = {};
        if (typeof sr.answers === "string") {
          try {
            answersObj = JSON.parse(sr.answers);
          } catch {
            answersObj = {};
          }
        } else if (sr.answers && typeof sr.answers === "object") {
          answersObj = sr.answers;
        }

        const answerKeys = Object.keys(answersObj);
        const formattedAnswers: Array<{
          question_id: string;
          order_num: number;
          question_text: string;
          question_type: string;
          answer_value: string;
          raw_value: any;
        }> = [];

        rawQuestions.forEach((q: any, idx: number) => {
          let val = answersObj[q.id];
          if (val === undefined) {
            if (finalAnswersByPos(answerKeys, answersObj, idx, q.order_num) !== undefined) {
              val = finalAnswersByPos(answerKeys, answersObj, idx, q.order_num);
            }
          }

          if (val !== undefined && val !== null && val !== "") {
            let opts: any[] = [];
            try {
              opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
            } catch {
              opts = [];
            }

            let displayVal = String(val);
            if (typeof val === "boolean") {
              displayVal = val ? "Yes" : "No";
            } else if (Array.isArray(opts) && opts.length > 0) {
              const matched = opts.find(
                (o: any, oIdx: number) =>
                  o.value === val ||
                  o.label === val ||
                  String(oIdx + 1) === String(val) ||
                  String(oIdx) === String(val)
              );
              if (matched) {
                displayVal = matched.label || matched.value || displayVal;
              }
            }

            formattedAnswers.push({
              question_id: q.id,
              order_num: q.order_num,
              question_text: q.question_text,
              question_type: q.question_type,
              answer_value: displayVal,
              raw_value: val,
            });
          }
        });

        return {
          ...sr,
          answers: answersObj,
          formatted_answers: formattedAnswers,
        };
      });

      return { responses, total };
    } catch (err) {
      console.warn("[AdminDB] DB error getting survey responses:", (err as Error).message);
    }
  }

  return { responses: [], total: 0 };
}

function finalAnswersByPos(keys: string[], answers: Record<string, any>, idx: number, orderNum: number): any {
  if (answers[`q_${orderNum}`] !== undefined) return answers[`q_${orderNum}`];
  if (answers[String(orderNum)] !== undefined) return answers[String(orderNum)];
  if (keys[idx] !== undefined) return answers[keys[idx]];
  return undefined;
}

export async function getSurveyAnalyticsAdmin(surveyId: string): Promise<any> {
  const survey = await getSurveyByIdAdmin(surveyId);
  if (!survey) throw new Error("Survey not found.");

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const targetUuid = survey.id;

      const summary = await sql`
        SELECT 
          count(*)::int as total_starts,
          count(*) FILTER (WHERE status = 'COMPLETED')::int as completions,
          count(*) FILTER (WHERE status IN ('STARTED', 'IN_PROGRESS'))::int as in_progress,
          count(*) FILTER (WHERE status = 'DISQUALIFIED')::int as disqualified,
          COALESCE(SUM(reward_coins) FILTER (WHERE reward_issued = true), 0)::int as total_coins_distributed,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'COMPLETED')::numeric(10,1) as avg_duration_seconds
        FROM survey_responses
        WHERE survey_id::text = ${targetUuid};
      `;

      const stats = summary[0] || {
        total_starts: 0,
        completions: 0,
        in_progress: 0,
        disqualified: 0,
        total_coins_distributed: 0,
        avg_duration_seconds: null,
      };

      const completionRate = stats.total_starts > 0 ? Math.round((stats.completions / stats.total_starts) * 100) : 0;
      const avgDurationMin = stats.avg_duration_seconds
        ? Number((Number(stats.avg_duration_seconds) / 60).toFixed(1))
        : 0;

      // Fetch survey questions
      const rawQuestions = await sql`
        SELECT id, order_num, question_text, question_type, options
        FROM survey_questions
        WHERE survey_id::text = ${targetUuid}
        ORDER BY order_num ASC;
      `;

      // Fetch all responses to compute question breakdowns
      const allResponses = await sql`
        SELECT answers, status
        FROM survey_responses
        WHERE survey_id::text = ${targetUuid};
      `;

      const questionsWithAnalytics = rawQuestions.map((q: any, qIdx: number) => {
        let opts: any[] = [];
        try {
          opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
        } catch {
          opts = [];
        }

        const distribution: Record<string, number> = {};
        if (Array.isArray(opts)) {
          opts.forEach((opt: any) => {
            const label = typeof opt === "string" ? opt : opt.label || opt.value || "";
            if (label) distribution[label] = 0;
          });
        }

        let responseCount = 0;
        let sumRatings = 0;
        let ratingCount = 0;

        for (const resp of allResponses) {
          let ansObj: Record<string, any> = {};
          if (typeof resp.answers === "string") {
            try {
              ansObj = JSON.parse(resp.answers);
            } catch {
              ansObj = {};
            }
          } else if (resp.answers && typeof resp.answers === "object") {
            ansObj = resp.answers;
          }

          let userVal = ansObj[q.id];
          if (userVal === undefined) {
            const keys = Object.keys(ansObj);
            if (ansObj[`q_${q.order_num}`] !== undefined) {
              userVal = ansObj[`q_${q.order_num}`];
            } else if (keys[qIdx] !== undefined) {
              userVal = ansObj[keys[qIdx]];
            }
          }

          if (userVal !== undefined && userVal !== null && userVal !== "") {
            responseCount++;

            if (q.question_type === "RATING" || q.question_type === "NPS" || q.question_type === "NUMBER") {
              const numVal = Number(userVal);
              if (!isNaN(numVal)) {
                sumRatings += numVal;
                ratingCount++;
              }
            }

            let label = String(userVal);
            if (typeof userVal === "boolean") {
              label = userVal ? "Yes" : "No";
            } else if (Array.isArray(opts) && opts.length > 0) {
              const matchedOpt = opts.find(
                (o: any, oIdx: number) =>
                  o.value === userVal ||
                  o.label === userVal ||
                  String(oIdx + 1) === String(userVal) ||
                  String(oIdx) === String(userVal)
              );
              if (matchedOpt) {
                label = matchedOpt.label || matchedOpt.value || label;
              }
            }

            distribution[label] = (distribution[label] || 0) + 1;
          }
        }

        const average = ratingCount > 0 ? (sumRatings / ratingCount).toFixed(1) : undefined;

        return {
          id: q.id,
          order_num: q.order_num,
          question_text: q.question_text,
          question_type: q.question_type,
          response_count: responseCount,
          distribution,
          average,
        };
      });

      return {
        surveyId: survey.id,
        title: survey.title,
        summary: {
          total_responses: stats.total_starts,
          completions: stats.completions,
          in_progress: stats.in_progress,
          disqualified: stats.disqualified,
          completion_rate: completionRate,
          avg_completion_time_min: avgDurationMin,
          total_coins_distributed: stats.total_coins_distributed,
        },
        stats: {
          ...stats,
          completionRate,
          avg_duration_min: avgDurationMin,
        },
        questions: questionsWithAnalytics,
        questionBreakdowns: {},
      };
    } catch (err) {
      console.warn("[AdminDB] DB error getting survey analytics, using default stats:", (err as Error).message);
    }
  }

  const completions = survey.responses_count || 120;
  return {
    surveyId: survey.id,
    title: survey.title,
    summary: {
      total_responses: completions + 18,
      completions,
      in_progress: 14,
      disqualified: 4,
      completion_rate: 87,
      avg_completion_time_min: 2.4,
      total_coins_distributed: completions * (survey.reward_coins || 50),
    },
    stats: {
      total_starts: completions + 18,
      completions,
      in_progress: 14,
      disqualified: 4,
      total_coins_distributed: completions * (survey.reward_coins || 50),
      avg_duration_seconds: 145,
      completionRate: 87,
    },
    questions: [],
    questionBreakdowns: {},
  };
}

export async function exportSurveyResponsesCsv(surveyId: string): Promise<string> {
  const survey = await getSurveyByIdAdmin(surveyId);
  if (!survey) throw new Error("Survey not found.");

  const { responses } = await getSurveyResponsesAdmin(survey.id, { limit: 10000 });

  const sanitizeCsv = (val: any): string => {
    if (val === undefined || val === null) return '""';
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = [
    "Response ID",
    "Customer ID",
    "Customer Name",
    "Phone",
    "City",
    "Status",
    "Reward Coins",
    "Reward Issued",
    "Started At",
    "Completed At",
    ...(survey.questions || []).map((q: any) => `Q${q.order_num || q.orderNum}: ${q.question_text || q.questionText}`),
  ];

  const rows = responses.map((r) => {
    return [
      sanitizeCsv(r.id),
      sanitizeCsv(r.customer_readable_id),
      sanitizeCsv(r.customer_name),
      sanitizeCsv(r.phone_e164),
      sanitizeCsv(r.customer_city),
      sanitizeCsv(r.status),
      sanitizeCsv(r.reward_coins),
      sanitizeCsv(r.reward_issued),
      sanitizeCsv(r.started_at || r.created_at),
      sanitizeCsv(r.completed_at),
      ...(survey.questions || []).map((q: any) => sanitizeCsv(r.answers?.[q.id])),
    ].join(",");
  });

  return [headers.map(sanitizeCsv).join(","), ...rows].join("\n");
}

// -----------------------------------------------------------------------------
// Rewards & Coin Ledger
// -----------------------------------------------------------------------------

export async function listCoinLedgerAdmin(params?: {
  limit?: number;
  offset?: number;
  customerId?: string;
}): Promise<{ transactions: any[]; total: number }> {
  if (isDirectDatabaseConfigured()) {
    try {
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
    } catch (err) {
      console.warn("[AdminDB] DB error listing coin ledger, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.listCoinLedger(params);
}

export async function executeManualCoinAdjustment(data: {
  customerId: string;
  amount: number;
  reasonCode: string;
  description: string;
  adminId: string;
  idempotencyKey: string;
}): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx) => {
        const existing = await tx`
          SELECT id FROM coin_transactions WHERE idempotency_key = ${data.idempotencyKey} LIMIT 1;
        `;
        if (existing.length > 0) {
          throw new Error(`Duplicate transaction detected with idempotency key ${data.idempotencyKey}`);
        }

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

        await tx`
          UPDATE customers
          SET reward_coins = ${newBalance}, updated_at = NOW()
          WHERE id = ${data.customerId};
        `;

        return txRow[0];
      });
    } catch (err) {
      console.warn("[AdminDB] DB error executing coin adjustment, using in-memory store:", (err as Error).message);
    }
  }

  return adminInMemoryStore.executeManualCoinAdjustment(data);
}

// -----------------------------------------------------------------------------
// Products and Scorecards
// -----------------------------------------------------------------------------

async function seedDefaultProductsIfEmpty(sql: any): Promise<void> {
  try {
    const existing = await sql`SELECT count(*)::int as cnt FROM products WHERE status = 'PUBLISHED';`;
    if (existing[0]?.cnt && existing[0].cnt >= 3) return;

    const seedItems = [
      {
        title: "GharSure Smart Indoor Climate & Humidity Monitor",
        category: "Smart Home",
        brand: "GharSure Lab",
        summary: "Real-time room temperature and humidity sensor with Bluetooth sync for household climate tracking.",
        specifications: { connectivity: "Bluetooth 5.0", accuracy: "±0.3°C", battery: "CR2450 (Included)", display: "E-Ink" },
        price_inr: 699,
        coin_price: 0,
        product_type: "GHARSURE_PRODUCT",
        inventory_stock: 120,
        is_featured: true,
        score: 9.5,
        status: "PUBLISHED",
      },
      {
        title: "GharSure Smart Appliance Energy & Power Monitor",
        category: "Smart Home",
        brand: "GharSure Lab",
        summary: "Plug-and-play energy monitor for home appliances with real-time wattage and voltage alerts.",
        specifications: { maxLoad: "16A (3600W)", connectivity: "Wi-Fi 2.4GHz", surgeProtection: "Integrated 4000V" },
        price_inr: 1499,
        coin_price: 0,
        product_type: "GHARSURE_PRODUCT",
        inventory_stock: 50,
        is_featured: true,
        score: 9.6,
        status: "PUBLISHED",
      },
      {
        title: "GharSure Anti-Scalant Magnetic Appliance Conditioner",
        category: "Appliance Care",
        brand: "GharSure Lab",
        summary: "Neodymium magnetic field water conditioner preventing limescale crystallization on pipes and geysers.",
        specifications: { pipeSize: "1/2 inch to 1 inch", magneticStrength: "12,000 Gauss", warranty: "5 Years" },
        price_inr: 2199,
        coin_price: 0,
        product_type: "GHARSURE_PRODUCT",
        inventory_stock: 35,
        is_featured: false,
        score: 9.2,
        status: "PUBLISHED",
      },
      {
        title: "Eco Surface & Glass Deep Clean Concentrate (Trial Mini)",
        category: "Trial Kits",
        brand: "CleanFlow",
        summary: "Plant-based multi-surface cleaning concentrate for kitchen counters, glass, and bathroom tiles.",
        specifications: { packSize: "100 ml", dilution: "1:10 with water", fragrance: "Eucalyptus & Mint", shelfLife: "24 months" },
        price_inr: 0,
        coin_price: 0,
        product_type: "TRIAL",
        inventory_stock: 200,
        is_featured: true,
        score: 9.4,
        status: "PUBLISHED",
      },
      {
        title: "Eco Descaler Pouch for Geysers & Washers",
        category: "Trial Kits",
        brand: "CleanFlow",
        summary: "Organic food-grade citric acid descaler pouch for scale removal in hard water regions.",
        specifications: { weight: "200g", activeIngredient: "Food Grade Citric Acid", applications: "Washing machines, geysers, kettles" },
        price_inr: 199,
        coin_price: 50,
        product_type: "TRIAL",
        inventory_stock: 150,
        is_featured: false,
        score: 9.1,
        status: "PUBLISHED",
      },
      {
        title: "Mineral Boost Alkaline Inline Cartridge Sample",
        category: "Trial Kits",
        brand: "MineralPure",
        summary: "Sample enrichment cartridge adding essential magnesium, calcium, and alkaline pH balance.",
        specifications: { pHBoost: "+1.5 to +2.0", minerals: "Ca, Mg, K", flowRate: "2 LPM" },
        price_inr: 499,
        coin_price: 100,
        product_type: "TRIAL",
        inventory_stock: 90,
        is_featured: false,
        score: 9.3,
        status: "PUBLISHED",
      },
      {
        title: "PurePro RO+UV Alkaline Water Purifier",
        category: "Water Purifiers",
        brand: "PurePro",
        summary: "7-stage purification with copper-alkaline enrichment and smart mineral retention.",
        specifications: { capacity: "10L", technology: "RO+UV+UF+Alkaline", power: "60W" },
        price_inr: 14999,
        coin_price: 0,
        product_type: "GENERAL_PRODUCT",
        inventory_stock: 45,
        is_featured: false,
        score: 9.4,
        status: "PUBLISHED",
      },
      {
        title: "Sediment & Carbon Pre-Filter Replacement Kit",
        category: "Spares",
        brand: "FilterMax",
        summary: "5-micron spun polypropylene sediment filter + active carbon block compatible with leading RO systems.",
        specifications: { lifespan: "6 months", poreSize: "5 micron" },
        price_inr: 1299,
        coin_price: 0,
        product_type: "GENERAL_PRODUCT",
        inventory_stock: 80,
        is_featured: false,
        score: 8.8,
        status: "PUBLISHED",
      },
      {
        title: "Universal Heavy-Duty RO Booster Pump (100 GPD)",
        category: "Spares",
        brand: "AquaDrive",
        summary: "High-pressure diaphragm booster pump with pure copper winding for low-pressure water connections.",
        specifications: { flowRate: "1.8 LPM", voltage: "24V DC", maxPressure: "125 PSI" },
        price_inr: 2450,
        coin_price: 0,
        product_type: "GENERAL_PRODUCT",
        inventory_stock: 40,
        is_featured: false,
        score: 9.0,
        status: "PUBLISHED",
      },
    ];

    for (const item of seedItems) {
      await sql`
        INSERT INTO products (
          title, category, brand, summary, specifications, price_inr, coin_price, product_type, inventory_stock, is_featured, score, status
        )
        VALUES (
          ${item.title}, ${item.category}, ${item.brand}, ${item.summary},
          ${JSON.stringify(item.specifications)}::jsonb, ${item.price_inr}, ${item.coin_price},
          ${item.product_type}, ${item.inventory_stock}, ${item.is_featured}, ${item.score}, ${item.status}
        );
      `;
    }
  } catch (err) {
    console.warn("[AdminDB] Seed products notice:", (err as Error).message);
  }
}

export async function listProductsAdmin(params?: {
  productType?: string;
  status?: string;
  search?: string;
}): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      // Ensure seed data exists if catalog is unpopulated
      await seedDefaultProductsIfEmpty(sql);

      const typeFilter = params?.productType && params.productType !== "ALL" ? params.productType : null;
      const statusFilter = params?.status && params.status !== "ALL" ? params.status : null;
      const searchPattern = params?.search ? `%${params.search.trim().toLowerCase()}%` : null;

      const rows = await sql`
        SELECT 
          id, title, category, brand, summary, specifications,
          price_inr, score, scorecard_details, evidence_sources,
          status, product_type, coin_price, inventory_stock, is_featured,
          created_at, updated_at
        FROM products
        WHERE (${typeFilter}::text IS NULL OR product_type = ${typeFilter})
          AND (${statusFilter}::text IS NULL OR status = ${statusFilter})
          AND (${searchPattern}::text IS NULL OR (
            LOWER(title) LIKE ${searchPattern}
            OR LOWER(brand) LIKE ${searchPattern}
            OR LOWER(category) LIKE ${searchPattern}
            OR LOWER(COALESCE(summary, '')) LIKE ${searchPattern}
          ))
        ORDER BY is_featured DESC, score DESC NULLS LAST, created_at DESC;
      `;
      if (rows) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing products, using in-memory:", (err as Error).message);
    }
  }
  return adminInMemoryStore.listProducts(params);
}

export async function saveProductAdmin(data: {
  id?: string;
  title: string;
  category: string;
  brand: string;
  summary: string;
  imageUrl?: string;
  specifications?: Record<string, unknown>;
  priceInr?: number;
  coinPrice?: number;
  productType?: "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT";
  inventoryStock?: number;
  isFeatured?: boolean;
  isHotPick?: boolean;
  isRecommended?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  discountPercent?: number;
  displayOrder?: number;
  highlightStartDate?: string | null;
  highlightEndDate?: string | null;
  score?: number | null;
  scorecardDetails?: Record<string, unknown>;
  evidenceSources?: any[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "STRUCK_OFF";
  strikeOffReason?: string;
}): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const productType = data.productType || "GENERAL_PRODUCT";
      const coinPrice = Number(data.coinPrice) || 0;
      const priceInr = Number(data.priceInr) || 0;
      const inventoryStock = Number(data.inventoryStock ?? 100);
      const isFeatured = Boolean(data.isFeatured);
      const isHotPick = Boolean(data.isHotPick);
      const isRecommended = Boolean(data.isRecommended);
      const isNewArrival = Boolean(data.isNewArrival);
      const isBestSeller = Boolean(data.isBestSeller);
      const discountPercent = Number(data.discountPercent) || 0;
      const displayOrder = Number(data.displayOrder) || 0;
      const status = data.status || "PUBLISHED";
      const imageUrl = data.imageUrl || null;

      if (data.id) {
        const rows = await sql`
          UPDATE products
          SET 
            title = ${data.title.trim()},
            category = ${data.category},
            brand = ${data.brand.trim()},
            summary = ${data.summary || ""},
            image_url = ${imageUrl},
            specifications = ${JSON.stringify(data.specifications || {})}::jsonb,
            price_inr = ${priceInr},
            coin_price = ${coinPrice},
            product_type = ${productType},
            inventory_stock = ${inventoryStock},
            is_featured = ${isFeatured},
            is_hot_pick = ${isHotPick},
            is_recommended = ${isRecommended},
            is_new_arrival = ${isNewArrival},
            is_best_seller = ${isBestSeller},
            discount_percent = ${discountPercent},
            display_order = ${displayOrder},
            highlight_start_date = ${data.highlightStartDate || null},
            highlight_end_date = ${data.highlightEndDate || null},
            score = ${data.score !== undefined ? data.score : null},
            scorecard_details = ${JSON.stringify(data.scorecardDetails || {})}::jsonb,
            evidence_sources = ${JSON.stringify(data.evidenceSources || [])}::jsonb,
            status = ${status},
            strike_off_reason = ${data.strikeOffReason || null},
            updated_at = NOW()
          WHERE id::text = ${data.id}
          RETURNING *;
        `;
        return rows[0];
      } else {
        const rows = await sql`
          INSERT INTO products (
            title, category, brand, summary, image_url, specifications, price_inr, coin_price, product_type,
            inventory_stock, is_featured, is_hot_pick, is_recommended, is_new_arrival, is_best_seller,
            discount_percent, display_order, highlight_start_date, highlight_end_date, score,
            scorecard_details, evidence_sources, status, strike_off_reason
          )
          VALUES (
            ${data.title.trim()}, ${data.category}, ${data.brand.trim()}, ${data.summary || ""}, ${imageUrl},
            ${JSON.stringify(data.specifications || {})}::jsonb, ${priceInr}, ${coinPrice}, ${productType},
            ${inventoryStock}, ${isFeatured}, ${isHotPick}, ${isRecommended}, ${isNewArrival}, ${isBestSeller},
            ${discountPercent}, ${displayOrder}, ${data.highlightStartDate || null}, ${data.highlightEndDate || null},
            ${data.score !== undefined ? data.score : null},
            ${JSON.stringify(data.scorecardDetails || {})}::jsonb, ${JSON.stringify(data.evidenceSources || [])}::jsonb,
            ${status}, ${data.strikeOffReason || null}
          )
          RETURNING *;
        `;
        return rows[0];
      }
    } catch (err) {
      console.warn("[AdminDB] DB error saving product, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.saveProduct(data);
}

export const upsertProductAdmin = saveProductAdmin;

/**
 * Strike off / Remove listing action
 * Safely deactivates listing, preserves historical records & orders, prevents further purchases
 */
export async function strikeOffProductAdmin(id: string, reason: string, adminId?: string): Promise<any> {
  const cleanReason = reason?.trim() || "Listing struck off by administrator";

  await logAdminAuditEvent({
    eventType: "PRODUCT_STRUCK_OFF",
    adminId,
    metadata: { productId: id, reason: cleanReason },
  });

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE products
        SET 
          status = 'STRUCK_OFF',
          strike_off_reason = ${cleanReason},
          struck_off_at = NOW(),
          is_featured = false,
          is_hot_pick = false,
          is_recommended = false,
          updated_at = NOW()
        WHERE id::text = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error striking off product:", (err as Error).message);
    }
  }

  return adminInMemoryStore.saveProduct({
    id,
    status: "STRUCK_OFF",
    strike_off_reason: cleanReason,
    is_featured: false,
    is_hot_pick: false,
    is_recommended: false,
  });
}

/**
 * Update merchandising controls (Hot Pick, Recommended, Featured, New Arrival, Best Seller, Display Order)
 */
export async function updateProductMerchandisingAdmin(
  id: string,
  data: {
    isHotPick?: boolean;
    isRecommended?: boolean;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    discountPercent?: number;
    displayOrder?: number;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "STRUCK_OFF";
    highlightStartDate?: string | null;
    highlightEndDate?: string | null;
  },
  adminId?: string
): Promise<any> {
  await logAdminAuditEvent({
    eventType: "PRODUCT_MERCHANDISING_UPDATED",
    adminId,
    metadata: { productId: id, merchandising: data },
  });

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE products
        SET 
          is_hot_pick = COALESCE(${data.isHotPick !== undefined ? data.isHotPick : null}, is_hot_pick),
          is_recommended = COALESCE(${data.isRecommended !== undefined ? data.isRecommended : null}, is_recommended),
          is_featured = COALESCE(${data.isFeatured !== undefined ? data.isFeatured : null}, is_featured),
          is_new_arrival = COALESCE(${data.isNewArrival !== undefined ? data.isNewArrival : null}, is_new_arrival),
          is_best_seller = COALESCE(${data.isBestSeller !== undefined ? data.isBestSeller : null}, is_best_seller),
          discount_percent = COALESCE(${data.discountPercent !== undefined ? data.discountPercent : null}, discount_percent),
          display_order = COALESCE(${data.displayOrder !== undefined ? data.displayOrder : null}, display_order),
          status = COALESCE(${data.status || null}, status),
          highlight_start_date = COALESCE(${data.highlightStartDate !== undefined ? data.highlightStartDate : null}, highlight_start_date),
          highlight_end_date = COALESCE(${data.highlightEndDate !== undefined ? data.highlightEndDate : null}, highlight_end_date),
          updated_at = NOW()
        WHERE id::text = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error updating merchandising:", (err as Error).message);
    }
  }

  return adminInMemoryStore.saveProduct({ id, ...data });
}

export async function deleteProductAdmin(id: string): Promise<boolean> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`DELETE FROM products WHERE id::text = ${id};`;
      return true;
    } catch (err) {
      console.warn("[AdminDB] DB error deleting product:", (err as Error).message);
    }
  }
  return adminInMemoryStore.deleteProduct(id);
}

// -----------------------------------------------------------------------------
// Store & Trials
// -----------------------------------------------------------------------------

export async function listTrialsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT t.*, p.title as product_title, p.brand as product_brand
        FROM trial_campaigns t
        LEFT JOIN products p ON t.product_id = p.id
        ORDER BY t.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing trials:", (err as Error).message);
    }
  }
  return [];
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
  if (isDirectDatabaseConfigured()) {
    try {
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
    } catch (err) {
      console.warn("[AdminDB] DB error saving trial:", (err as Error).message);
    }
  }

  return { ...data, id: data.id || `trial-${Date.now()}` };
}

// -----------------------------------------------------------------------------
// Referrals
// -----------------------------------------------------------------------------

export async function listReferralsAdmin(filter?: { status?: string; search?: string }): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const searchPattern = filter?.search ? `%${filter.search.trim().toLowerCase()}%` : null;
      const statusFilter = filter?.status && filter.status !== "ALL" ? filter.status : null;

      const rows = await sql`
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
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing referrals:", (err as Error).message);
    }
  }

  return [];
}

export async function updateReferralStatusAdmin(
  id: string,
  status: "PENDING" | "QUALIFIED" | "REWARDED" | "REJECTED",
  rejectionReason?: string,
  adminId?: string
): Promise<any> {
  if (status === "REWARDED") {
    try {
      await executeReferralReward(id, adminId);
    } catch (err) {
      console.warn("[AdminDB] executeReferralReward warning:", (err as Error).message);
    }
  }

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE referral_attributions
        SET 
          status = ${status}, 
          qualified_at = CASE WHEN ${status} = 'QUALIFIED' THEN NOW() ELSE qualified_at END,
          rejection_reason = CASE WHEN ${status} = 'REJECTED' THEN ${rejectionReason || 'Rejected by administrator'} ELSE rejection_reason END
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error updating referral status:", (err as Error).message);
    }
  }

  return { id, status, rejectionReason };
}

// -----------------------------------------------------------------------------
// Building Intelligence
// -----------------------------------------------------------------------------

export async function listBuildingsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT b.*,
               (SELECT count(*)::int FROM building_observations bo WHERE bo.building_id = b.id) as observations_count
        FROM buildings b
        ORDER BY b.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing buildings, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.listBuildings();
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
  if (isDirectDatabaseConfigured()) {
    try {
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
    } catch (err) {
      console.warn("[AdminDB] DB error saving building, saving in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.saveBuilding(data);
}

export async function listObservationsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT bo.*, b.name as building_name, b.city, b.locality, c.customer_id as reporter_id
        FROM building_observations bo
        JOIN buildings b ON bo.building_id = b.id
        LEFT JOIN customers c ON bo.customer_id = c.id
        ORDER BY bo.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing observations:", (err as Error).message);
    }
  }

  return [];
}

export async function moderateObservationAdmin(
  id: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE building_observations
        SET moderation_status = ${status}, rejection_reason = ${rejectionReason || null}
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error moderating observation:", (err as Error).message);
    }
  }

  return { id, status, rejectionReason };
}

// -----------------------------------------------------------------------------
// Communications & Notifications
// -----------------------------------------------------------------------------

export async function listNotificationCampaignsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT nc.*, adm.email as created_by_email
        FROM notification_campaigns nc
        LEFT JOIN admin_users adm ON nc.created_by = adm.id
        ORDER BY nc.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing notification campaigns:", (err as Error).message);
    }
  }

  return [];
}

export async function createNotificationCampaignAdmin(data: {
  title: string;
  channel: "WHATSAPP" | "IN_APP" | "SMS";
  templateName: string;
  bodyText: string;
  targetFilter?: Record<string, unknown>;
  adminId?: string;
}): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        INSERT INTO notification_campaigns (title, channel, template_name, body_text, target_filter, status, created_by)
        VALUES (
          ${data.title.trim()}, ${data.channel}, ${data.templateName.trim()},
          ${data.bodyText}, ${JSON.stringify(data.targetFilter || {})}::jsonb, 'DRAFT', ${data.adminId || null}
        )
        RETURNING *;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error creating notification campaign:", (err as Error).message);
    }
  }

  return { ...data, id: `camp-${Date.now()}`, status: "DRAFT" };
}

export async function executeNotificationSendAdmin(id: string): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
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
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("[AdminDB] DB error sending notification:", (err as Error).message);
    }
  }

  return { id, status: "SENT", sent_count: 3 };
}

// -----------------------------------------------------------------------------
// Support Tickets
// -----------------------------------------------------------------------------

export async function listSupportTicketsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT st.*, c.customer_id as readable_customer_id, c.full_name as customer_name, c.phone_e164,
               adm.full_name as assigned_to_name
        FROM support_tickets st
        JOIN customers c ON st.customer_id = c.id
        LEFT JOIN admin_users adm ON st.assigned_to = adm.id
        ORDER BY st.created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[AdminDB] DB error listing support tickets, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.listSupportTickets();
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
  if (isDirectDatabaseConfigured()) {
    try {
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
    } catch (err) {
      console.warn("[AdminDB] DB error saving support ticket, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.saveSupportTicket(data);
}

// -----------------------------------------------------------------------------
// System Settings
// -----------------------------------------------------------------------------

export async function getSystemSettingsAdmin(): Promise<Record<string, any>> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql<{ key: string; value: any }[]>`
        SELECT key, value FROM system_settings;
      `;
      if (rows && rows.length > 0) {
        const result: Record<string, any> = {};
        for (const r of rows) {
          result[r.key] = r.value;
        }
        return result;
      }
    } catch (err) {
      console.warn("[AdminDB] DB error reading system settings, using in-memory:", (err as Error).message);
    }
  }

  return adminInMemoryStore.getSystemSettings();
}

export async function updateSystemSettingAdmin(
  key: string,
  value: any,
  adminId: string
): Promise<void> {
  adminInMemoryStore.updateSystemSetting(key, value);

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`
        INSERT INTO system_settings (key, value, updated_by, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${adminId}, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(value)}::jsonb, updated_by = ${adminId}, updated_at = NOW();
      `;
    } catch (err) {
      console.warn("[AdminDB] DB error updating system setting:", (err as Error).message);
    }
  }
}

// -----------------------------------------------------------------------------
// Admin File Activities & Submissions Management (Upload Image/File activities)
// -----------------------------------------------------------------------------

export async function listFileActivitiesAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT fa.*,
          (SELECT count(*)::int FROM file_submissions WHERE activity_id = fa.id) as total_submissions,
          (SELECT count(*)::int FROM file_submissions WHERE activity_id = fa.id AND status = 'SUBMITTED') as pending_submissions,
          (SELECT count(*)::int FROM file_submissions WHERE activity_id = fa.id AND status = 'APPROVED') as approved_submissions
        FROM file_activities fa
        ORDER BY fa.created_at DESC;
      `;
      return rows;
    } catch (err) {
      console.warn("[AdminDB] Error listing file activities:", (err as Error).message);
    }
  }
  return [];
}

export async function upsertFileActivityAdmin(data: {
  id?: string;
  title: string;
  description: string;
  instructions?: string;
  documentType: string;
  acceptedFormats?: string[];
  maxFileSizeBytes?: number;
  coinReward: number;
  approvalRequired?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  adminId?: string;
}): Promise<any> {
  const approvalRequired = data.approvalRequired !== undefined ? Boolean(data.approvalRequired) : true;
  const status = data.status || "PUBLISHED";
  const acceptedFormats = data.acceptedFormats || ["image/jpeg", "image/png", "application/pdf"];

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      if (data.id) {
        const rows = await sql`
          UPDATE file_activities
          SET 
            title = ${data.title.trim()},
            description = ${data.description.trim()},
            instructions = ${data.instructions || null},
            document_type = ${data.documentType},
            accepted_formats = ${acceptedFormats},
            max_file_size_bytes = ${data.maxFileSizeBytes || 10485760},
            coin_reward = ${data.coinReward},
            approval_required = ${approvalRequired},
            status = ${status},
            updated_at = NOW()
          WHERE id::text = ${data.id}
          RETURNING *;
        `;
        await logAdminAuditEvent({
          eventType: "FILE_ACTIVITY_UPDATED",
          adminId: data.adminId,
          metadata: { activityId: data.id, title: data.title },
        });
        return rows[0];
      } else {
        const rows = await sql`
          INSERT INTO file_activities (
            title, description, instructions, document_type, accepted_formats,
            max_file_size_bytes, coin_reward, approval_required, status
          )
          VALUES (
            ${data.title.trim()}, ${data.description.trim()}, ${data.instructions || null},
            ${data.documentType}, ${acceptedFormats}, ${data.maxFileSizeBytes || 10485760},
            ${data.coinReward}, ${approvalRequired}, ${status}
          )
          RETURNING *;
        `;
        await logAdminAuditEvent({
          eventType: "FILE_ACTIVITY_CREATED",
          adminId: data.adminId,
          metadata: { activityId: rows[0]?.id, title: data.title },
        });
        return rows[0];
      }
    } catch (err) {
      console.warn("[AdminDB] Error saving file activity:", (err as Error).message);
    }
  }

  return { ...data, id: data.id || `fa-${Date.now()}` };
}

export async function listFileSubmissionsAdmin(filter?: {
  activityId?: string;
  status?: string;
  search?: string;
}): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const statusFilter = filter?.status && filter.status !== "ALL" ? filter.status : null;
      const activityFilter = filter?.activityId && filter.activityId !== "ALL" ? filter.activityId : null;
      const searchPattern = filter?.search ? `%${filter.search.trim().toLowerCase()}%` : null;

      const rows = await sql`
        SELECT 
          fs.*,
          fa.title as activity_title,
          fa.document_type,
          fa.coin_reward as activity_coin_reward,
          c.full_name as customer_name,
          c.phone_e164 as customer_phone,
          c.customer_id as readable_customer_id,
          adm.full_name as reviewer_name
        FROM file_submissions fs
        JOIN file_activities fa ON fs.activity_id = fa.id
        JOIN customers c ON fs.customer_id = c.id
        LEFT JOIN admin_users adm ON fs.reviewed_by = adm.id
        WHERE (${statusFilter}::text IS NULL OR fs.status = ${statusFilter})
          AND (${activityFilter}::uuid IS NULL OR fs.activity_id = ${activityFilter})
          AND (${searchPattern}::text IS NULL OR (
            LOWER(c.full_name) LIKE ${searchPattern}
            OR c.phone_e164 LIKE ${searchPattern}
            OR LOWER(c.customer_id) LIKE ${searchPattern}
            OR LOWER(fs.file_name) LIKE ${searchPattern}
          ))
        ORDER BY fs.created_at DESC;
      `;
      return rows;
    } catch (err) {
      console.warn("[AdminDB] Error listing file submissions:", (err as Error).message);
    }
  }
  return [];
}

/**
 * Review file submission (Approve / Reject) with atomic reward crediting & audit logging
 */
export async function reviewFileSubmissionAdmin(data: {
  submissionId: string;
  adminId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
  reviewerNotes?: string;
}): Promise<{ success: boolean; error?: string; coinsAwarded?: number }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        // 1. Fetch submission with lock
        const subs = await tx`
          SELECT fs.*, fa.title as activity_title, fa.coin_reward
          FROM file_submissions fs
          JOIN file_activities fa ON fs.activity_id = fa.id
          WHERE fs.id::text = ${data.submissionId}
          FOR UPDATE;
        `;

        if (!subs || subs.length === 0) {
          return { success: false, error: "Submission not found" };
        }
        const submission = subs[0];

        if (submission.status === "APPROVED" || submission.status === "REWARD_CREDITED") {
          return { success: false, error: "This submission has already been approved and rewarded." };
        }

        if (data.decision === "APPROVE") {
          const coinReward = Number(submission.coin_reward) || 50;

          // Update customer coins
          await tx`
            UPDATE customers
            SET reward_coins = reward_coins + ${coinReward}, updated_at = NOW()
            WHERE id = ${submission.customer_id};
          `;

          // Record in coin_transactions
          const idempotencyKey = `review_file_${submission.id}`;
          const txRows = await tx`
            INSERT INTO coin_transactions (
              customer_id, amount, type, description, idempotency_key, admin_id, metadata
            )
            VALUES (
              ${submission.customer_id},
              ${coinReward},
              'STORE_REDEMPTION',
              ${`Approved submission for ${submission.activity_title}`},
              ${idempotencyKey},
              ${data.adminId},
              ${JSON.stringify({
                action: "FILE_ACTIVITY_REWARD",
                submissionId: submission.id,
                activityId: submission.activity_id,
                coinReward,
              })}::jsonb
            )
            RETURNING id;
          `;

          // Update submission
          await tx`
            UPDATE file_submissions
            SET 
              status = 'APPROVED',
              reviewed_by = ${data.adminId},
              reviewed_at = NOW(),
              reviewer_notes = ${data.reviewerNotes || null},
              reward_coins_awarded = ${coinReward},
              reward_transaction_id = ${txRows[0]?.id || null},
              updated_at = NOW()
            WHERE id = ${submission.id};
          `;

          await logAdminAuditEvent({
            eventType: "FILE_SUBMISSION_APPROVED",
            adminId: data.adminId,
            customerId: submission.customer_id,
            metadata: { submissionId: submission.id, coinReward },
          });

          return { success: true, coinsAwarded: coinReward };
        } else {
          // REJECT
          await tx`
            UPDATE file_submissions
            SET 
              status = 'REJECTED',
              rejection_reason = ${data.rejectionReason || "Document does not satisfy requirements"},
              reviewer_notes = ${data.reviewerNotes || null},
              reviewed_by = ${data.adminId},
              reviewed_at = NOW(),
              updated_at = NOW()
            WHERE id = ${submission.id};
          `;

          await logAdminAuditEvent({
            eventType: "FILE_SUBMISSION_REJECTED",
            adminId: data.adminId,
            customerId: submission.customer_id,
            metadata: { submissionId: submission.id, reason: data.rejectionReason },
          });

          return { success: true };
        }
      });
    } catch (err: any) {
      console.warn("[AdminDB] Error reviewing submission:", err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: true, coinsAwarded: 50 };
}

// -----------------------------------------------------------------------------
// Admin Quick Polls Management
// -----------------------------------------------------------------------------

export async function listQuickPollsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const polls = await sql`
        SELECT qp.*,
          (SELECT count(*)::int FROM quick_poll_responses WHERE poll_id = qp.id) as total_responses
        FROM quick_polls qp
        ORDER BY qp.created_at DESC;
      `;

      if (polls.length === 0) return [];
      const pollIds = polls.map((p: any) => p.id);
      const options = await sql`
        SELECT * FROM quick_poll_options WHERE poll_id = ANY(${pollIds}) ORDER BY display_order ASC;
      `;

      return polls.map((p: any) => ({
        ...p,
        options: options.filter((o: any) => o.poll_id === p.id),
      }));
    } catch (err) {
      console.warn("[AdminDB] Error listing quick polls:", (err as Error).message);
    }
  }
  return [];
}

export async function upsertQuickPollAdmin(data: {
  id?: string;
  title: string;
  question: string;
  pollType?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  coinReward?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  options: string[];
  adminId?: string;
}): Promise<any> {
  const pollType = data.pollType || "SINGLE_CHOICE";
  const coinReward = Number(data.coinReward) || 15;
  const status = data.status || "PUBLISHED";

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        let pollId = data.id;

        if (pollId) {
          await tx`
            UPDATE quick_polls
            SET 
              title = ${data.title.trim()},
              question = ${data.question.trim()},
              poll_type = ${pollType},
              coin_reward = ${coinReward},
              status = ${status},
              updated_at = NOW()
            WHERE id::text = ${pollId};
          `;
        } else {
          const rows = await tx`
            INSERT INTO quick_polls (title, question, poll_type, coin_reward, status)
            VALUES (${data.title.trim()}, ${data.question.trim()}, ${pollType}, ${coinReward}, ${status})
            RETURNING id;
          `;
          pollId = rows[0]?.id;
        }

        // Replace options if provided
        if (data.options && data.options.length > 0) {
          // If editing existing, keep existing options and append or replace
          await tx`DELETE FROM quick_poll_options WHERE poll_id = ${pollId};`;
          for (let i = 0; i < data.options.length; i++) {
            await tx`
              INSERT INTO quick_poll_options (poll_id, option_text, display_order)
              VALUES (${pollId}, ${data.options[i].trim()}, ${i + 1});
            `;
          }
        }

        await logAdminAuditEvent({
          eventType: pollId === data.id ? "QUICK_POLL_UPDATED" : "QUICK_POLL_CREATED",
          adminId: data.adminId,
          metadata: { pollId, title: data.title },
        });

        return { id: pollId, ...data };
      });
    } catch (err) {
      console.warn("[AdminDB] Error saving quick poll:", (err as Error).message);
    }
  }

  return { ...data, id: data.id || `qp-${Date.now()}` };
}

export async function deleteQuickPollAdmin(id: string, adminId?: string): Promise<boolean> {
  await logAdminAuditEvent({
    eventType: "QUICK_POLL_DELETED",
    adminId,
    metadata: { pollId: id },
  });

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`DELETE FROM quick_polls WHERE id::text = ${id};`;
      return true;
    } catch (err) {
      console.warn("[AdminDB] Error deleting quick poll:", (err as Error).message);
    }
  }
  return true;
}

// -----------------------------------------------------------------------------
// Admin Home Page Content Management (Banners & Sections)
// -----------------------------------------------------------------------------

export async function listHomeBannersAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql`
        SELECT * FROM home_banners ORDER BY display_order ASC, created_at DESC;
      `;
    } catch (err) {
      console.warn("[AdminDB] Error listing home banners:", (err as Error).message);
    }
  }
  return [];
}

export async function upsertHomeBannerAdmin(data: {
  id?: string;
  title: string;
  subtitle?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  displayOrder?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  adminId?: string;
}): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const status = data.status || "PUBLISHED";
      const displayOrder = Number(data.displayOrder) || 0;
      const linkUrl = data.linkUrl || "/store";

      if (data.id) {
        const rows = await sql`
          UPDATE home_banners
          SET 
            title = ${data.title.trim()},
            subtitle = ${data.subtitle || null},
            desktop_image_url = ${data.desktopImageUrl},
            mobile_image_url = ${data.mobileImageUrl || null},
            link_url = ${linkUrl},
            display_order = ${displayOrder},
            status = ${status},
            updated_at = NOW()
          WHERE id::text = ${data.id}
          RETURNING *;
        `;
        return rows[0];
      } else {
        const rows = await sql`
          INSERT INTO home_banners (
            title, subtitle, desktop_image_url, mobile_image_url, link_url, display_order, status
          )
          VALUES (
            ${data.title.trim()}, ${data.subtitle || null}, ${data.desktopImageUrl},
            ${data.mobileImageUrl || null}, ${linkUrl}, ${displayOrder}, ${status}
          )
          RETURNING *;
        `;
        return rows[0];
      }
    } catch (err) {
      console.warn("[AdminDB] Error saving home banner:", (err as Error).message);
    }
  }
  return { ...data, id: data.id || `banner-${Date.now()}` };
}

export async function deleteHomeBannerAdmin(id: string): Promise<boolean> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`DELETE FROM home_banners WHERE id::text = ${id};`;
      return true;
    } catch (err) {
      console.warn("[AdminDB] Error deleting home banner:", (err as Error).message);
    }
  }
  return true;
}

export async function listHomeSectionsAdmin(): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql`
        SELECT * FROM home_sections ORDER BY display_order ASC;
      `;
    } catch (err) {
      console.warn("[AdminDB] Error listing home sections:", (err as Error).message);
    }
  }
  return [];
}

export async function updateHomeSectionAdmin(
  sectionKey: string,
  data: {
    title?: string;
    subtitle?: string;
    isVisible?: boolean;
    displayOrder?: number;
    config?: Record<string, any>;
  },
  adminId?: string
): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE home_sections
        SET 
          title = COALESCE(${data.title || null}, title),
          subtitle = COALESCE(${data.subtitle !== undefined ? data.subtitle : null}, subtitle),
          is_visible = COALESCE(${data.isVisible !== undefined ? data.isVisible : null}, is_visible),
          display_order = COALESCE(${data.displayOrder !== undefined ? data.displayOrder : null}, display_order),
          config = COALESCE(${data.config ? JSON.stringify(data.config) : null}::jsonb, config),
          updated_at = NOW()
        WHERE section_key = ${sectionKey}
        RETURNING *;
      `;
      await logAdminAuditEvent({
        eventType: "HOME_SECTION_UPDATED",
        adminId,
        metadata: { sectionKey, ...data },
      });
      return rows[0];
    } catch (err) {
      console.warn("[AdminDB] Error updating home section:", (err as Error).message);
    }
  }
  return { sectionKey, ...data };
}

// -----------------------------------------------------------------------------
// Admin User Management & Customer Details Drill-down (Section 2.B)
// -----------------------------------------------------------------------------

export async function getCustomerDetailedProfileAdmin(customerId: string): Promise<any> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const customers = await sql`
        SELECT * FROM customers
        WHERE id::text = ${customerId} OR customer_id = ${customerId};
      `;
      if (!customers || customers.length === 0) return null;
      const c = customers[0];

      const [ledger, surveys, submissions, vouchers, orders, referrals] = await Promise.all([
        sql`SELECT * FROM coin_transactions WHERE customer_id = ${c.id} ORDER BY created_at DESC LIMIT 50;`,
        sql`
          SELECT sr.*, s.title as survey_title
          FROM survey_responses sr
          LEFT JOIN surveys s ON sr.survey_id = s.id
          WHERE sr.customer_id = ${c.id}
          ORDER BY sr.created_at DESC;
        `,
        sql`
          SELECT fs.*, fa.title as activity_title, fa.document_type
          FROM file_submissions fs
          JOIN file_activities fa ON fs.activity_id = fa.id
          WHERE fs.customer_id = ${c.id}
          ORDER BY fs.created_at DESC;
        `,
        sql`
          SELECT cv.*, v.title as voucher_title, v.code as voucher_code, v.discount_value
          FROM customer_vouchers cv
          JOIN vouchers v ON cv.voucher_id = v.id
          WHERE cv.customer_id = ${c.id}
          ORDER BY cv.created_at DESC;
        `,
        sql`SELECT * FROM orders WHERE customer_id = ${c.id} ORDER BY created_at DESC LIMIT 50;`,
        sql`
          SELECT ra.*, rec.customer_id as referee_code, rec.full_name as referee_name
          FROM referral_attributions ra
          JOIN customers rec ON ra.referee_id = rec.id
          WHERE ra.referrer_id = ${c.id}
          ORDER BY ra.created_at DESC;
        `,
      ]);

      return {
        customer: c,
        ledger,
        surveys,
        submissions,
        vouchers,
        orders,
        referrals,
      };
    } catch (err) {
      console.warn("[AdminDB] Error loading detailed customer profile:", (err as Error).message);
    }
  }

  const cust = await getCustomerDetailAdmin(customerId);
  return { customer: cust, ledger: [], surveys: [], submissions: [], vouchers: [], orders: [], referrals: [] };
}

export async function toggleCustomerStatusAdmin(
  customerId: string,
  status: "ACTIVE" | "SUSPENDED",
  adminId?: string
): Promise<boolean> {
  await logAdminAuditEvent({
    eventType: status === "SUSPENDED" ? "CUSTOMER_SUSPENDED" : "CUSTOMER_ACTIVATED",
    adminId,
    customerId,
    metadata: { newStatus: status },
  });

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      await sql`
        UPDATE customers
        SET onboarding_status = ${status === "SUSPENDED" ? "SUSPENDED" : "COMPLETED"}, updated_at = NOW()
        WHERE id::text = ${customerId} OR customer_id = ${customerId};
      `;
      return true;
    } catch (err) {
      console.warn("[AdminDB] Error updating customer status:", (err as Error).message);
    }
  }
  return true;
}

export async function adjustCustomerCoinsAdmin(data: {
  customerId: string;
  amount: number;
  reason: string;
  adminId: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  if (!data.amount || data.amount === 0) {
    return { success: false, error: "Adjustment amount cannot be zero." };
  }

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      return await sql.begin(async (tx: any) => {
        const custs = await tx`
          SELECT id, reward_coins, full_name, phone_e164 FROM customers
          WHERE id::text = ${data.customerId} OR customer_id = ${data.customerId}
          FOR UPDATE;
        `;
        if (!custs || custs.length === 0) {
          return { success: false, error: "Customer not found." };
        }
        const cust = custs[0];
        const newBalance = (cust.reward_coins ?? 0) + data.amount;

        if (newBalance < 0) {
          return { success: false, error: "Adjustment would result in a negative coin balance." };
        }

        await tx`
          UPDATE customers
          SET reward_coins = ${newBalance}, updated_at = NOW()
          WHERE id = ${cust.id};
        `;

        const idempotencyKey = `manual_adj_${cust.id}_${Date.now()}`;
        await tx`
          INSERT INTO coin_transactions (
            customer_id, amount, type, description, idempotency_key, admin_id, metadata
          )
          VALUES (
            ${cust.id},
            ${data.amount},
            'MANUAL_ADJUSTMENT',
            ${data.reason.trim()},
            ${idempotencyKey},
            ${data.adminId},
            ${JSON.stringify({ reason: data.reason.trim(), adminId: data.adminId })}::jsonb
          );
        `;

        await logAdminAuditEvent({
          eventType: "CUSTOMER_COINS_MANUALLY_ADJUSTED",
          adminId: data.adminId,
          customerId: cust.id,
          metadata: { amount: data.amount, reason: data.reason, newBalance },
        });

        return { success: true, newBalance };
      });
    } catch (err: any) {
      console.warn("[AdminDB] Error adjusting customer coins:", err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: true, newBalance: 100 };
}

