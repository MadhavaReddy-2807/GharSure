import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Ensure .env.local is loaded for live DB tests
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import {
  getDashboardMetrics,
  listSurveysAdmin,
  getSurveyResponsesAdmin,
  listCustomersAdmin,
  listCoinLedgerAdmin,
  getAdminByEmail,
} from "@/lib/admin-db";
import { verifyAdminPassword } from "@/lib/admin-auth";

describe("Live Supabase Admin Queries", () => {
  it("authenticates admin credentials from environment", async () => {
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@gharsure.com";
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || "123456";
    const adminUser = await getAdminByEmail(adminEmail);
    expect(adminUser).not.toBeNull();
    expect(adminUser?.role).toBe("SUPER_ADMIN");

    const valid = verifyAdminPassword(adminPass, adminUser!.password_hash);
    expect(valid).toBe(true);
  });

  it("fetches live dashboard metrics from database", async () => {
    const metrics = await getDashboardMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalCustomers).toBeGreaterThanOrEqual(1);
  });

  it("lists real surveys from database without ENOTFOUND", async () => {
    const surveys = await listSurveysAdmin();
    expect(Array.isArray(surveys)).toBe(true);
    expect(surveys.length).toBeGreaterThanOrEqual(1);
    
    // Check responses for first survey
    const first = surveys[0];
    const resp = await getSurveyResponsesAdmin(first.id);
    expect(resp).toBeDefined();
    expect(Array.isArray(resp.responses)).toBe(true);
  });

  it("lists real customers and ledger transactions from database", async () => {
    const customers = await listCustomersAdmin();
    expect(customers.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(customers.customers)).toBe(true);

    const ledger = await listCoinLedgerAdmin();
    expect(ledger).toBeDefined();
    expect(Array.isArray(ledger.transactions)).toBe(true);
  });
});
