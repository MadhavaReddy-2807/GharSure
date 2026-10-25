/**
 * GharSure In-Memory Admin Fallback Store
 * Provides persistent memory storage for admin portal operations,
 * users, customer moderation, metrics, and audit logs when PostgreSQL is offline.
 */

import crypto from "crypto";
import { AdminRole, ROLE_PERMISSIONS } from "./admin-auth";
import { AdminUserRecord, DashboardMetrics } from "./admin-db";

const DEFAULT_BOOTSTRAP_HASH =
  "a8f3b2c1d0e9f8a7b6c5d4e3f2a1b0c9:62fece060e9fc2df3aaa55fbf124b9c6cc1e403ecd6153718cee75d47a6809fbbd8484b06d747510017c8743dc833e80c6f30da8b9ff0e31d8fc66abae93ce21";

export class AdminMemoryStore {
  private static instance: AdminMemoryStore;

  private admins: Map<string, AdminUserRecord> = new Map();
  private auditEvents: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    admin_id?: string | null;
    customer_id?: string | null;
    phone_e164?: string | null;
    ip_address?: string | null;
    created_at: string;
    metadata?: Record<string, unknown> | null;
    admin_email?: string;
    admin_name?: string;
    customer_name?: string;
    readable_customer_id?: string;
  }> = [];

  private customers: Map<string, any> = new Map();
  private coinTransactions: Array<any> = [];
  private products: Map<string, any> = new Map();
  private trials: Map<string, any> = new Map();
  private referrals: Map<string, any> = new Map();
  private buildings: Map<string, any> = new Map();
  private observations: Map<string, any> = new Map();
  private notificationCampaigns: Map<string, any> = new Map();
  private supportTickets: Map<string, any> = new Map();
  private systemSettings: Map<string, any> = new Map();

  private constructor() {
    this.seed();
  }

  public static getInstance(): AdminMemoryStore {
    if (!AdminMemoryStore.instance) {
      AdminMemoryStore.instance = new AdminMemoryStore();
    }
    return AdminMemoryStore.instance;
  }

  public seed(): void {
    // 1. Initial Super Admin
    const superAdminEmail = (process.env.ADMIN_INITIAL_EMAIL || "admin@gharsure.com").toLowerCase().trim();
    const superAdminName = process.env.ADMIN_INITIAL_NAME || "GharSure Super Admin";
    const superAdminId = "cbf0791a-c195-4e6a-9aad-4c8274dd386e";

    const superAdmin: AdminUserRecord = {
      id: superAdminId,
      email: superAdminEmail,
      full_name: superAdminName,
      password_hash: DEFAULT_BOOTSTRAP_HASH,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: new Date().toISOString(),
      last_login_at: null,
    };
    this.admins.set(superAdmin.id, superAdmin);

    // 2. Initial Customers
    const initialCustomers = [
      {
        id: "cust-1",
        customer_id: "GH000001",
        phone_e164: "+919876543210",
        full_name: "Ananya Sharma",
        display_name: "Ananya",
        city: "Bengaluru",
        onboarding_completed: true,
        status: "ACTIVE",
        reward_coins: 250,
        support_notes: "Apartment: Prestige Shantiniketan, Tower 4, Flat 1204",
        household_details: { homeType: "Apartment", members: 4, waterPurifier: "Kent RO" },
        referral_code: "ANANYA25",
        created_at: "2026-10-15T10:00:00.000Z",
        updated_at: "2026-10-24T12:00:00.000Z",
        surveys_count: 2,
      },
      {
        id: "cust-2",
        customer_id: "GH000002",
        phone_e164: "+919811223344",
        full_name: "Rohan Mehta",
        display_name: "Rohan",
        city: "Bengaluru",
        onboarding_completed: true,
        status: "ACTIVE",
        reward_coins: 140,
        support_notes: "Sobha Dream Acres, Wing 18, Flat 602",
        household_details: { homeType: "Apartment", members: 3, waterPurifier: "AO Smith" },
        referral_code: "ROHAN40",
        created_at: "2026-10-18T14:30:00.000Z",
        updated_at: "2026-10-24T10:00:00.000Z",
        surveys_count: 1,
      },
      {
        id: "cust-3",
        customer_id: "GH000003",
        phone_e164: "+919733445566",
        full_name: "Priya Sundaram",
        display_name: "Priya",
        city: "Bengaluru",
        onboarding_completed: true,
        status: "ACTIVE",
        reward_coins: 180,
        support_notes: "Brigade Gateway, Apt 810",
        household_details: { homeType: "Apartment", members: 2, waterPurifier: "Aquaguard" },
        referral_code: "PRIYA80",
        created_at: "2026-10-20T09:15:00.000Z",
        updated_at: "2026-10-24T15:00:00.000Z",
        surveys_count: 1,
      },
    ];
    for (const c of initialCustomers) {
      this.customers.set(c.id, c);
    }

    // 3. Initial Coin Transactions
    this.coinTransactions = [
      {
        id: "ctx-1",
        customer_id: "cust-1",
        readable_customer_id: "GH000001",
        customer_name: "Ananya Sharma",
        phone_e164: "+919876543210",
        amount: 50,
        type: "SURVEY_REWARD",
        description: "Survey completion: User Experience Survey",
        idempotency_key: "tx_surv_exp_01_ananya",
        created_at: "2026-10-24T12:00:00.000Z",
      },
      {
        id: "ctx-2",
        customer_id: "cust-1",
        readable_customer_id: "GH000001",
        customer_name: "Ananya Sharma",
        phone_e164: "+919876543210",
        amount: 200,
        type: "REFERRAL_BONUS",
        description: "Qualified neighbor referral bonus",
        idempotency_key: "tx_ref_bonus_ananya",
        created_at: "2026-10-23T11:00:00.000Z",
      },
      {
        id: "ctx-3",
        customer_id: "cust-2",
        readable_customer_id: "GH000002",
        customer_name: "Rohan Mehta",
        phone_e164: "+919811223344",
        amount: 40,
        type: "SURVEY_REWARD",
        description: "Survey completion: Bangalore Water Quality & Purifier Health Survey",
        idempotency_key: "tx_surv_water_rohan",
        created_at: "2026-10-24T10:00:00.000Z",
      },
    ];

    // 4. Products
    const initialProducts = [
      {
        id: "prod-1",
        title: "PurePro RO+UV Alkaline Water Purifier",
        category: "Water Purifiers",
        brand: "PurePro",
        summary: "7-stage purification with copper-alkaline enrichment and smart TDS retention.",
        specifications: { capacity: "10L", technology: "RO+UV+UF+Alkaline", power: "60W" },
        price_inr: 14999,
        score: 9.4,
        status: "PUBLISHED",
        created_at: "2026-10-01T00:00:00.000Z",
        updated_at: "2026-10-20T00:00:00.000Z",
      },
      {
        id: "prod-2",
        title: "GharSure Smart Water Hardness (TDS) Tester",
        category: "Testing Kits",
        brand: "GharSure Lab",
        summary: "Titanium-alloy probe digital meter with instant backlit LCD reading.",
        specifications: { range: "0-9990 ppm", accuracy: "±2%", battery: "CR2032" },
        price_inr: 699,
        score: 9.1,
        status: "PUBLISHED",
        created_at: "2026-10-05T00:00:00.000Z",
        updated_at: "2026-10-22T00:00:00.000Z",
      },
      {
        id: "prod-3",
        title: "Sediment & Carbon Pre-Filter Replacement Kit",
        category: "Spares",
        brand: "FilterMax",
        summary: "5-micron spun polypropylene sediment filter + active carbon block.",
        specifications: { lifespan: "6 months", poreSize: "5 micron" },
        price_inr: 1299,
        score: 8.8,
        status: "PUBLISHED",
        created_at: "2026-10-10T00:00:00.000Z",
        updated_at: "2026-10-23T00:00:00.000Z",
      },
    ];
    for (const p of initialProducts) {
      this.products.set(p.id, p);
    }

    // 5. Buildings
    const initialBuildings = [
      {
        id: "bld-1",
        name: "Prestige Shantiniketan",
        pincode: "560048",
        city: "Bengaluru",
        locality: "Whitefield",
        total_units: 3002,
        water_source: "Borewell + Cauvery",
        avg_tds: 480,
        observations_count: 24,
        created_at: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "bld-2",
        name: "Sobha Dream Acres",
        pincode: "560087",
        city: "Bengaluru",
        locality: "Panathur",
        total_units: 6500,
        water_source: "Tanker + Borewell",
        avg_tds: 720,
        observations_count: 42,
        created_at: "2026-09-15T00:00:00.000Z",
      },
      {
        id: "bld-3",
        name: "Brigade Gateway",
        pincode: "560055",
        city: "Bengaluru",
        locality: "Rajajinagar",
        total_units: 1255,
        water_source: "Cauvery",
        avg_tds: 190,
        observations_count: 18,
        created_at: "2026-09-20T00:00:00.000Z",
      },
    ];
    for (const b of initialBuildings) {
      this.buildings.set(b.id, b);
    }

    // 6. Support Tickets
    const initialTickets = [
      {
        id: "tick-1",
        ticket_number: "TICK-102941",
        customer_id: "cust-1",
        readable_customer_id: "GH000001",
        customer_name: "Ananya Sharma",
        phone_e164: "+919876543210",
        subject: "Water Purifier Trial scheduling inquiry",
        category: "TRIALS",
        priority: "MEDIUM",
        status: "OPEN",
        assigned_to_name: "GharSure Super Admin",
        notes: [{ text: "Customer requested evening installation slot.", by: "Admin", at: "2026-10-24T14:00:00.000Z" }],
        created_at: "2026-10-24T12:30:00.000Z",
      },
    ];
    for (const t of initialTickets) {
      this.supportTickets.set(t.id, t);
    }

    // 7. System Settings
    this.systemSettings.set("brand_name", "GharSure");
    this.systemSettings.set("support_email", "support@gharsure.com");
    this.systemSettings.set("default_coin_rate", 1);
    this.systemSettings.set("onboarding_reward_coins", 100);
    this.systemSettings.set("referral_bonus_coins", 150);
  }

  // Admin Auth & Management
  public getAdminByEmail(email: string): AdminUserRecord | null {
    const clean = email.toLowerCase().trim();
    for (const admin of this.admins.values()) {
      if (admin.email.toLowerCase().trim() === clean) {
        return admin;
      }
    }
    return null;
  }

  public getAdminById(id: string): AdminUserRecord | null {
    return this.admins.get(id) || null;
  }

  public recordLogin(id: string): void {
    const admin = this.admins.get(id);
    if (admin) {
      admin.last_login_at = new Date().toISOString();
      admin.updated_at = new Date().toISOString();
    }
  }

  public listAdmins(): Omit<AdminUserRecord, "password_hash">[] {
    return Array.from(this.admins.values()).map(({ password_hash, ...rest }) => rest);
  }

  public countActiveSuperAdmins(): number {
    return Array.from(this.admins.values()).filter(
      (a) => a.role === "SUPER_ADMIN" && a.status === "ACTIVE"
    ).length;
  }

  public createAdmin(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: AdminRole;
    invitedBy?: string;
  }): AdminUserRecord {
    const id = crypto.randomUUID();
    const newAdmin: AdminUserRecord = {
      id,
      email: data.email.toLowerCase().trim(),
      full_name: data.fullName.trim(),
      password_hash: data.passwordHash,
      role: data.role,
      status: "ACTIVE",
      permissions: ROLE_PERMISSIONS[data.role] || [],
      invited_by: data.invitedBy || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.admins.set(newAdmin.id, newAdmin);
    return newAdmin;
  }

  public updateAdmin(
    id: string,
    data: {
      fullName?: string;
      role?: AdminRole;
      status?: "ACTIVE" | "SUSPENDED";
      passwordHash?: string;
    }
  ): AdminUserRecord {
    const admin = this.admins.get(id);
    if (!admin) throw new Error("Admin not found.");

    if (data.role || data.status) {
      if (admin.role === "SUPER_ADMIN") {
        const isDemotion = data.role && data.role !== "SUPER_ADMIN";
        const isSuspension = data.status && data.status === "SUSPENDED";
        if (isDemotion || isSuspension) {
          if (this.countActiveSuperAdmins() <= 1) {
            throw new Error("Action denied: Cannot demote or suspend the last active Super Admin.");
          }
        }
      }
    }

    if (data.fullName) admin.full_name = data.fullName.trim();
    if (data.role) {
      admin.role = data.role;
      admin.permissions = ROLE_PERMISSIONS[data.role] || [];
    }
    if (data.status) admin.status = data.status;
    if (data.passwordHash) admin.password_hash = data.passwordHash;
    admin.updated_at = new Date().toISOString();

    return admin;
  }

  // Audit Events
  public logAuditEvent(data: {
    eventType: string;
    adminId?: string | null;
    customerId?: string | null;
    phone?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown>;
  }): void {
    const admin = data.adminId ? this.admins.get(data.adminId) : null;
    const customer = data.customerId ? this.customers.get(data.customerId) : null;

    this.auditEvents.unshift({
      id: `evt-${crypto.randomBytes(4).toString("hex")}`,
      event_type: data.eventType,
      actor_type: data.adminId ? "ADMIN" : "CUSTOMER",
      admin_id: data.adminId || null,
      customer_id: data.customerId || null,
      phone_e164: data.phone || customer?.phone_e164 || null,
      ip_address: data.ipAddress || null,
      created_at: new Date().toISOString(),
      metadata: data.metadata || null,
      admin_email: admin?.email,
      admin_name: admin?.full_name,
      customer_name: customer?.full_name,
      readable_customer_id: customer?.customer_id,
    });

    if (this.auditEvents.length > 500) {
      this.auditEvents.pop();
    }
  }

  public listAuditEvents(params?: {
    limit?: number;
    offset?: number;
    eventType?: string;
    actorType?: string;
  }): { events: any[]; total: number } {
    let filtered = this.auditEvents;
    if (params?.eventType) {
      filtered = filtered.filter((e) => e.event_type === params.eventType);
    }
    if (params?.actorType) {
      filtered = filtered.filter((e) => e.actor_type === params.actorType);
    }

    const total = filtered.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    return {
      events: filtered.slice(offset, offset + limit),
      total,
    };
  }

  // Customers
  public listCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    onboarding?: string;
  }): { customers: any[]; total: number; page: number; limit: number } {
    let list = Array.from(this.customers.values());
    const search = params?.search?.toLowerCase().trim();

    if (search) {
      list = list.filter(
        (c) =>
          c.customer_id.toLowerCase().includes(search) ||
          (c.full_name && c.full_name.toLowerCase().includes(search)) ||
          c.phone_e164.includes(search)
      );
    }

    if (params?.status && params.status !== "ALL") {
      list = list.filter((c) => c.status === params.status);
    }

    if (params?.onboarding) {
      const isCompleted = params.onboarding === "COMPLETED";
      list = list.filter((c) => c.onboarding_completed === isCompleted);
    }

    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const offset = (page - 1) * limit;

    return {
      customers: list.slice(offset, offset + limit),
      total: list.length,
      page,
      limit,
    };
  }

  public getCustomerDetail(id: string): any | null {
    const customer =
      this.customers.get(id) ||
      Array.from(this.customers.values()).find((c) => c.customer_id === id);
    if (!customer) return null;

    const transactions = this.coinTransactions.filter((tx) => tx.customer_id === customer.id);
    return {
      ...customer,
      surveys: [],
      transactions,
    };
  }

  public updateCustomerStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "DELETED"): void {
    const customer = this.customers.get(id);
    if (customer) {
      customer.status = status;
      customer.updated_at = new Date().toISOString();
    }
  }

  public updateCustomerFields(
    id: string,
    data: { fullName?: string; city?: string; supportNotes?: string }
  ): void {
    const customer = this.customers.get(id);
    if (customer) {
      if (data.fullName) customer.full_name = data.fullName.trim();
      if (data.city) customer.city = data.city.trim();
      if (data.supportNotes !== undefined) customer.support_notes = data.supportNotes;
      customer.updated_at = new Date().toISOString();
    }
  }

  // Coin Ledger
  public listCoinLedger(params?: { limit?: number; offset?: number; customerId?: string }): {
    transactions: any[];
    total: number;
  } {
    let list = this.coinTransactions;
    if (params?.customerId) {
      list = list.filter((tx) => tx.customer_id === params.customerId);
    }
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    return {
      transactions: list.slice(offset, offset + limit),
      total: list.length,
    };
  }

  public executeManualCoinAdjustment(data: {
    customerId: string;
    amount: number;
    reasonCode: string;
    description: string;
    adminId: string;
    idempotencyKey: string;
  }): any {
    const customer = this.customers.get(data.customerId);
    if (!customer) throw new Error("Customer not found.");

    const currentBalance = customer.reward_coins || 0;
    const newBalance = currentBalance + data.amount;
    if (newBalance < 0) {
      throw new Error(`Insufficient coin balance. Current: ${currentBalance}, adjustment: ${data.amount}`);
    }

    customer.reward_coins = newBalance;
    customer.updated_at = new Date().toISOString();

    const tx = {
      id: `ctx-${crypto.randomBytes(4).toString("hex")}`,
      customer_id: customer.id,
      readable_customer_id: customer.customer_id,
      customer_name: customer.full_name,
      phone_e164: customer.phone_e164,
      amount: data.amount,
      type: "MANUAL_ADJUSTMENT",
      description: data.description,
      idempotency_key: data.idempotencyKey,
      admin_id: data.adminId,
      created_at: new Date().toISOString(),
    };

    this.coinTransactions.unshift(tx);
    return tx;
  }

  // Products
  public listProducts(): any[] {
    return Array.from(this.products.values());
  }

  public saveProduct(data: any): any {
    if (data.id && this.products.has(data.id)) {
      const existing = this.products.get(data.id);
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      this.products.set(data.id, updated);
      return updated;
    }
    const id = data.id || `prod-${crypto.randomBytes(4).toString("hex")}`;
    const newProd = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.set(id, newProd);
    return newProd;
  }

  // Buildings
  public listBuildings(): any[] {
    return Array.from(this.buildings.values());
  }

  public saveBuilding(data: any): any {
    if (data.id && this.buildings.has(data.id)) {
      const existing = this.buildings.get(data.id);
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      this.buildings.set(data.id, updated);
      return updated;
    }
    const id = data.id || `bld-${crypto.randomBytes(4).toString("hex")}`;
    const newBld = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      observations_count: 0,
    };
    this.buildings.set(id, newBld);
    return newBld;
  }

  // Support Tickets
  public listSupportTickets(): any[] {
    return Array.from(this.supportTickets.values());
  }

  public saveSupportTicket(data: any): any {
    if (data.id && this.supportTickets.has(data.id)) {
      const existing = this.supportTickets.get(data.id);
      const notes = existing.notes || [];
      if (data.note) {
        notes.push({ text: data.note, by: data.adminEmail || "Admin", at: new Date().toISOString() });
      }
      const updated = {
        ...existing,
        ...data,
        notes,
        updated_at: new Date().toISOString(),
      };
      this.supportTickets.set(data.id, updated);
      return updated;
    }
    const id = data.id || `tick-${crypto.randomBytes(4).toString("hex")}`;
    const newTick = {
      ...data,
      id,
      ticket_number: data.ticketNumber || `TICK-${Date.now().toString().slice(-6)}`,
      notes: data.note ? [{ text: data.note, by: data.adminEmail || "Admin", at: new Date().toISOString() }] : [],
      created_at: new Date().toISOString(),
    };
    this.supportTickets.set(id, newTick);
    return newTick;
  }

  // System Settings
  public getSystemSettings(): Record<string, any> {
    const res: Record<string, any> = {};
    for (const [k, v] of this.systemSettings.entries()) {
      res[k] = v;
    }
    return res;
  }

  public updateSystemSetting(key: string, value: any): void {
    this.systemSettings.set(key, value);
  }

  // Dashboard Metrics
  public getDashboardMetrics(): DashboardMetrics {
    const activeCust = Array.from(this.customers.values()).filter((c) => c.status === "ACTIVE").length;
    let coinsIssued = 0;
    let coinsRedeemed = 0;
    for (const tx of this.coinTransactions) {
      if (tx.amount > 0) coinsIssued += tx.amount;
      else coinsRedeemed += Math.abs(tx.amount);
    }

    return {
      totalCustomers: this.customers.size,
      activeCustomers: activeCust,
      newRegistrations7d: this.customers.size,
      surveysPublished: 3,
      surveysCompleted: 286,
      coinsIssued,
      coinsRedeemed,
      totalProducts: this.products.size,
      activeTrials: 1,
      totalBuildings: this.buildings.size,
      openTickets: Array.from(this.supportTickets.values()).filter((t) => t.status === "OPEN").length,
      recentAuditEvents: this.auditEvents.slice(0, 8),
    };
  }
}

export const adminInMemoryStore = AdminMemoryStore.getInstance();
