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
  }, 15000);

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

  it("saves questions with frontend IDs (e.g. q-123456) and publishes successfully", async () => {
    const { saveSurveyQuestionsAdmin, publishSurveyAdmin, getSurveyByIdAdmin } = await import("@/lib/admin-db");
    const surveys = await listSurveysAdmin();
    // Find SURVEY-2 or any draft/survey
    const target = surveys.find((s) => s.survey_id === "SURVEY-2") || surveys[0];
    expect(target).toBeDefined();

    const testQuestions = [
      {
        id: `q-${Date.now()}`,
        orderNum: 1,
        questionText: "What is your primary household water source?",
        questionType: "SINGLE_CHOICE",
        description: "Select one option",
        isRequired: true,
        options: [
          { label: "Borewell", value: "borewell" },
          { label: "Municipal Supply", value: "municipal" },
        ],
        validationRules: {},
      },
      {
        id: `q-${Date.now() + 1}`,
        orderNum: 2,
        questionText: "How often do you service your drinking water purifier?",
        questionType: "SINGLE_CHOICE",
        description: "Choose maintenance frequency",
        isRequired: true,
        options: [
          { label: "Every 3 months", value: "3m" },
          { label: "Every 6 months", value: "6m" },
        ],
        validationRules: {},
      },
    ];

    // Save questions
    await saveSurveyQuestionsAdmin(target.id, testQuestions);

    // Verify questions loaded from DB
    const loaded = await getSurveyByIdAdmin(target.id);
    expect(loaded).not.toBeNull();
    expect(loaded.questions.length).toBe(2);
    expect(loaded.questions[0].questionText).toBe("What is your primary household water source?");

    // Publish survey
    const pub = await publishSurveyAdmin(target.id);
    expect(pub).toBeDefined();
    expect(pub.status).toBe("PUBLISHED");
  }, 20000);
});
