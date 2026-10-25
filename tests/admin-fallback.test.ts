import { describe, it, expect } from "vitest";
import { getAdminByEmail, getAdminById, recordAdminLogin, listAdmins, listSurveysAdmin } from "../src/lib/admin-db";
import { verifyAdminPassword } from "../src/lib/admin-auth";
import {
  listAvailableSurveysForCustomer,
  getSurveyForTaking,
  startOrResumeSurveyAttempt,
  saveSurveyAutosave,
  submitSurveyCompletion,
} from "../src/lib/survey-db";

describe("Admin Fallback & Authentication Reliability", () => {
  it("successfully retrieves bootstrap super admin from in-memory fallback", async () => {
    const admin = await getAdminByEmail("admin@gharsure.com");
    expect(admin).not.toBeNull();
    expect(admin?.email).toBe("admin@gharsure.com");
    expect(admin?.role).toBe("SUPER_ADMIN");
    expect(admin?.status).toBe("ACTIVE");

    const adminById = await getAdminById(admin!.id);
    expect(adminById).not.toBeNull();
    expect(adminById?.id).toBe(admin!.id);
  });

  it("verifies credentials with GharSureAdmin@2026! and 123456", async () => {
    const admin = await getAdminByEmail("admin@gharsure.com");
    expect(admin).not.toBeNull();

    // Verifies with default bootstrap password
    expect(verifyAdminPassword("GharSureAdmin@2026!", admin!.password_hash)).toBe(true);

    // Verifies with alternative dev password
    expect(verifyAdminPassword("123456", admin!.password_hash)).toBe(true);

    // Rejects incorrect passwords
    expect(verifyAdminPassword("WrongPassword!", admin!.password_hash)).toBe(false);
    expect(verifyAdminPassword("", admin!.password_hash)).toBe(false);
  });

  it("records admin login without throwing", async () => {
    const admin = await getAdminByEmail("admin@gharsure.com");
    await expect(recordAdminLogin(admin!.id)).resolves.not.toThrow();
  });

  it("lists all administrators safely", async () => {
    const admins = await listAdmins();
    expect(admins.length).toBeGreaterThan(0);
    expect(admins[0].email).toBe("admin@gharsure.com");
  });
});

describe("Dummy Surveys & High-Completion Survey Flow", () => {
  it("provides pre-seeded dummy surveys in admin list", async () => {
    const adminSurveys = await listSurveysAdmin();
    expect(adminSurveys.length).toBeGreaterThanOrEqual(3);

    const userExpSurvey = adminSurveys.find((s) => s.survey_id === "SURV-EXPERIENCE-01");
    expect(userExpSurvey).toBeDefined();
    expect(userExpSurvey.title).toBe("User Experience Survey");
    expect(userExpSurvey.status).toBe("PUBLISHED");

    const waterSurvey = adminSurveys.find((s) => s.survey_id === "SURV-WATER-BLR-01");
    expect(waterSurvey).toBeDefined();

    const applianceSurvey = adminSurveys.find((s) => s.survey_id === "SURV-APPLIANCE-01");
    expect(applianceSurvey).toBeDefined();
  });

  it("lists available dummy surveys for a customer", async () => {
    const testCustomerId = "test-cust-123";
    const available = await listAvailableSurveysForCustomer(testCustomerId);

    expect(available.length).toBeGreaterThanOrEqual(3);
    const surveyIds = available.map((s) => s.surveyId || s.id);
    expect(surveyIds).toContain("SURV-EXPERIENCE-01");
    expect(surveyIds).toContain("SURV-WATER-BLR-01");
    expect(surveyIds).toContain("SURV-APPLIANCE-01");
  });

  it("loads full question definition for taking a survey", async () => {
    const testCustomerId = "test-cust-456";
    const data = await getSurveyForTaking("SURV-EXPERIENCE-01", testCustomerId);

    expect(data).not.toBeNull();
    expect(data.survey.title).toBe("User Experience Survey");
    expect(data.questions.length).toBe(5);

    // Verify first question matches reference UI requirements
    const q1 = data.questions[0];
    expect(q1.questionText).toBe("Which device do you use most frequently?");
    expect(q1.questionType).toBe("SINGLE_CHOICE");
    expect(q1.isRequired).toBe(true);

    // Verify second question is square checkbox multiple choice
    const q2 = data.questions[1];
    expect(q2.questionText).toBe("Which features do you value the most?");
    expect(q2.questionType).toBe("MULTIPLE_CHOICE");
  });

  it("supports starting, autosaving, and completing dummy survey with reward coins", async () => {
    const customerId = "test-cust-completer";
    const surveyId = "SURV-EXPERIENCE-01";

    // 1. Start survey
    const startResult = await startOrResumeSurveyAttempt(surveyId, customerId);
    expect(startResult.attempt).not.toBeNull();
    expect(startResult.isCompleted).toBe(false);

    const attemptId = startResult.attempt.id;

    // 2. Autosave answer
    const autosaveResult = await saveSurveyAutosave(attemptId, customerId, {
      q1: "mobile",
      q2: ["appliances", "water"],
    });
    expect(autosaveResult.success).toBe(true);

    // 3. Complete survey
    const submitResult = await submitSurveyCompletion(attemptId, customerId, {
      q1: "mobile",
      q2: ["appliances", "water"],
      q3: 5,
      q4: true,
      q5: "Great smooth experience!",
    });

    expect(submitResult.success).toBe(true);
    expect(submitResult.status).toBe("COMPLETED");
    expect(submitResult.coinsAwarded).toBe(50);
  });
});
