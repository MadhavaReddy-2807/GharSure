/**
 * GharSure Dummy Surveys & In-Memory Survey Engine Store
 * Provides rich, realistic survey definitions and in-memory response handling
 * when direct PostgreSQL database is unavailable or during offline development.
 */

import crypto from "crypto";

export interface DummyQuestionOption {
  label: string;
  value: string | number;
  text?: string;
  id?: string;
}

export interface DummySurveyQuestion {
  id: string;
  surveyId?: string;
  orderNum: number;
  questionText: string;
  questionType:
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "DROPDOWN"
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "NUMBER"
    | "YES_NO"
    | "RATING_SCALE"
    | "STAR_RATING"
    | "DATE"
    | "MATRIX";
  description?: string | null;
  options?: any;
  isRequired: boolean;
  validationRules?: Record<string, any>;
  branchingRules?: any[];
  sectionName?: string | null;
}

export interface DummySurvey {
  id: string;
  survey_id: string;
  title: string;
  description: string;
  category: string;
  survey_type: "STATIC" | "DECISION_BASED";
  language: string;
  estimated_duration_min: number;
  internal_objective?: string;
  sponsor_details?: string;
  reward_coins: number;
  response_quota: number;
  responses_count: number;
  allow_resume: boolean;
  allow_review: boolean;
  status: "DRAFT" | "TESTING" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";
  version: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  questions: DummySurveyQuestion[];
}

export interface DummySurveyAttempt {
  id: string;
  survey_id: string;
  customer_id: string;
  status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "DISQUALIFIED";
  answers: Record<string, any>;
  current_question_id?: string | null;
  question_path: string[];
  reward_coins: number;
  reward_issued: boolean;
  started_at: string;
  last_saved_at: string;
  completed_at?: string | null;
}

const INITIAL_DUMMY_SURVEYS: DummySurvey[] = [
  // ---------------------------------------------------------------------------
  // Survey 1: User Experience Survey (Exact Match to Screenshot Reference)
  // ---------------------------------------------------------------------------
  {
    id: "surv-exp-01",
    survey_id: "SURV-EXPERIENCE-01",
    title: "User Experience Survey",
    description: "Help us understand how you navigate GharSure so we can improve your experience.",
    category: "User Experience",
    survey_type: "STATIC",
    language: "en",
    estimated_duration_min: 3,
    internal_objective: "Gather feedback on UI simplicity, mobile responsiveness, and high-frequency features",
    sponsor_details: "GharSure Product Design & Research Team",
    reward_coins: 50,
    response_quota: 1000,
    responses_count: 142,
    allow_resume: true,
    allow_review: false,
    status: "PUBLISHED",
    version: 1,
    created_at: "2026-10-20T10:00:00.000Z",
    updated_at: "2026-10-24T12:00:00.000Z",
    published_at: "2026-10-24T12:00:00.000Z",
    questions: [
      {
        id: "q1",
        orderNum: 1,
        questionText: "Which device do you use most frequently?",
        questionType: "SINGLE_CHOICE",
        description: "Choose the primary device where you browse and manage GharSure.",
        isRequired: true,
        options: [
          { label: "Mobile (iOS/Android)", value: "mobile" },
          { label: "Desktop or Laptop", value: "desktop" },
          { label: "Tablet", value: "tablet" },
        ],
      },
      {
        id: "q2",
        orderNum: 2,
        questionText: "Which features do you value the most?",
        questionType: "MULTIPLE_CHOICE",
        description: "Select all that apply to your household priorities.",
        isRequired: true,
        options: [
          { label: "Appliance health tracking", value: "appliances" },
          { label: "Water quality & hardness insights", value: "water" },
          { label: "Preventative maintenance alerts", value: "alerts" },
          { label: "Rewards and survey coins", value: "rewards" },
        ],
      },
      {
        id: "q3",
        orderNum: 3,
        questionText: "How satisfied are you with GharSure's speed and reliability?",
        questionType: "RATING_SCALE",
        description: "Rate on a scale from 1 (Needs Improvement) to 5 (Extremely Satisfied).",
        isRequired: false,
        options: [
          { value: 1, label: "Needs Improvement" },
          { value: 2, label: "Fair" },
          { value: 3, label: "Good" },
          { value: 4, label: "Very Good" },
          { value: 5, label: "Extremely Satisfied" },
        ],
        validationRules: { minRating: 1, maxRating: 5 },
      },
      {
        id: "q4",
        orderNum: 4,
        questionText: "Would you recommend GharSure to friends or neighbors in your apartment complex?",
        questionType: "YES_NO",
        description: "Your honest referral feedback helps us build trusted community benchmarks.",
        isRequired: true,
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
      },
      {
        id: "q5",
        orderNum: 5,
        questionText: "What improvements or new features would you like to see next?",
        questionType: "LONG_TEXT",
        description: "Share any thoughts, requests, or frustrations you've experienced.",
        isRequired: false,
        validationRules: { maxCharacters: 500 },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Survey 2: Bangalore Water Quality & Purifier Health Survey
  // ---------------------------------------------------------------------------
  {
    id: "surv-water-01",
    survey_id: "SURV-WATER-BLR-01",
    title: "Bangalore Water Quality & Purifier Health Survey",
    description: "Share your water source, TDS levels, and purifier filter changes to help build community insights in your locality.",
    category: "Water Quality",
    survey_type: "STATIC",
    language: "en",
    estimated_duration_min: 3,
    internal_objective: "Map water hardness variance across Bangalore localities and purifier lifespan trends",
    sponsor_details: "GharSure Water Lab & Community Analytics",
    reward_coins: 40,
    response_quota: 1500,
    responses_count: 88,
    allow_resume: true,
    allow_review: false,
    status: "PUBLISHED",
    version: 1,
    created_at: "2026-10-21T08:30:00.000Z",
    updated_at: "2026-10-24T14:15:00.000Z",
    published_at: "2026-10-24T14:15:00.000Z",
    questions: [
      {
        id: "wq1",
        orderNum: 1,
        questionText: "What is the primary source of water in your home or apartment?",
        questionType: "SINGLE_CHOICE",
        description: "Select your main incoming tap water supply.",
        isRequired: true,
        options: [
          { label: "Cauvery municipal supply", value: "cauvery" },
          { label: "Borewell / Groundwater", value: "borewell" },
          { label: "Private Water Tanker", value: "tanker" },
          { label: "Mixed (Cauvery + Tanker)", value: "mixed" },
        ],
      },
      {
        id: "wq2",
        orderNum: 2,
        questionText: "Do you use a dedicated drinking water purifier (RO / UV / UF)?",
        questionType: "YES_NO",
        isRequired: true,
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
      },
      {
        id: "wq3",
        orderNum: 3,
        questionText: "Which brand of water purifier is installed in your kitchen?",
        questionType: "SINGLE_CHOICE",
        description: "Helps us benchmark filter durability across models.",
        isRequired: false,
        options: [
          { label: "Kent RO", value: "kent" },
          { label: "Aquaguard / Eureka Forbes", value: "aquaguard" },
          { label: "AO Smith", value: "aosmith" },
          { label: "Urban Company Native", value: "native" },
          { label: "Livpure", value: "livpure" },
          { label: "Other / Unbranded", value: "other" },
        ],
      },
      {
        id: "wq4",
        orderNum: 4,
        questionText: "How often do you replace your purifier filters / cartridges?",
        questionType: "SINGLE_CHOICE",
        isRequired: false,
        options: [
          { label: "Every 3–6 months", value: "3-6m" },
          { label: "Every 6–12 months", value: "6-12m" },
          { label: "Only when water flow stops or tastes bad", value: "reactive" },
          { label: "Not sure / Apartment maintenance manages it", value: "not_sure" },
        ],
      },
      {
        id: "wq5",
        orderNum: 5,
        questionText: "What is the approximate TDS level of your incoming tap water if known?",
        questionType: "DROPDOWN",
        description: "Total Dissolved Solids (in parts per million).",
        isRequired: false,
        options: [
          { label: "Less than 150 ppm (Soft)", value: "under_150" },
          { label: "150 - 300 ppm (Moderate)", value: "150_300" },
          { label: "300 - 600 ppm (Hard)", value: "300_600" },
          { label: "Over 600 ppm (Very hard)", value: "over_600" },
          { label: "Not measured / Don't know", value: "unknown" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Survey 3: Household Appliance Health & Maintenance Audit
  // ---------------------------------------------------------------------------
  {
    id: "surv-appliance-01",
    survey_id: "SURV-APPLIANCE-01",
    title: "Household Appliance Health & Maintenance Audit",
    description: "Help us identify frequent appliance issues and breakdown risks in high-rise residences.",
    category: "Appliances",
    survey_type: "STATIC",
    language: "en",
    estimated_duration_min: 4,
    internal_objective: "Analyze common maintenance triggers and power surge impacts on household electronics",
    sponsor_details: "GharSure Appliance Protection Division",
    reward_coins: 60,
    response_quota: 1200,
    responses_count: 56,
    allow_resume: true,
    allow_review: false,
    status: "PUBLISHED",
    version: 1,
    created_at: "2026-10-22T11:00:00.000Z",
    updated_at: "2026-10-24T16:00:00.000Z",
    published_at: "2026-10-24T16:00:00.000Z",
    questions: [
      {
        id: "ap1",
        orderNum: 1,
        questionText: "Which major appliances in your home are older than 3 years?",
        questionType: "MULTIPLE_CHOICE",
        description: "Select all that apply to your current residence.",
        isRequired: true,
        options: [
          { label: "Refrigerator", value: "refrigerator" },
          { label: "Washing Machine", value: "washing_machine" },
          { label: "Air Conditioner (AC)", value: "ac" },
          { label: "Geyser / Water Heater", value: "geyser" },
          { label: "Microwave Oven", value: "microwave" },
          { label: "None / All under 3 years", value: "none" },
        ],
      },
      {
        id: "ap2",
        orderNum: 2,
        questionText: "Have you experienced sudden power surges or voltage fluctuations in the past 6 months?",
        questionType: "YES_NO",
        isRequired: true,
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
      },
      {
        id: "ap3",
        orderNum: 3,
        questionText: "How do you usually book service repairs for your household appliances?",
        questionType: "SINGLE_CHOICE",
        isRequired: false,
        options: [
          { label: "Official brand service center", value: "brand" },
          { label: "Urban Company / Online aggregators", value: "online" },
          { label: "Local neighborhood technician", value: "local" },
          { label: "Apartment maintenance team", value: "facility" },
        ],
      },
      {
        id: "ap4",
        orderNum: 4,
        questionText: "Rate your overall satisfaction with appliance warranty service in India",
        questionType: "STAR_RATING",
        description: "1 star = Very Poor, 5 stars = Exceptional",
        isRequired: false,
        options: [
          { value: 1, label: "1 Star" },
          { value: 2, label: "2 Stars" },
          { value: 3, label: "3 Stars" },
          { value: 4, label: "4 Stars" },
          { value: 5, label: "5 Stars" },
        ],
      },
      {
        id: "ap5",
        orderNum: 5,
        questionText: "Any suggestions to make appliance tracking more helpful for your home?",
        questionType: "SHORT_TEXT",
        isRequired: false,
        validationRules: { maxCharacters: 200 },
      },
    ],
  },
];

class DummySurveyStore {
  private static instance: DummySurveyStore;
  private surveys: Map<string, DummySurvey> = new Map();
  private attempts: Map<string, DummySurveyAttempt> = new Map();

  private constructor() {
    this.seed();
  }

  public static getInstance(): DummySurveyStore {
    if (!DummySurveyStore.instance) {
      DummySurveyStore.instance = new DummySurveyStore();
    }
    return DummySurveyStore.instance;
  }

  public seed(): void {
    for (const survey of INITIAL_DUMMY_SURVEYS) {
      this.surveys.set(survey.id, { ...survey });
      this.surveys.set(survey.survey_id, { ...survey });
    }
  }

  public listPublishedSurveys(): DummySurvey[] {
    const seen = new Set<string>();
    const list: DummySurvey[] = [];
    for (const s of this.surveys.values()) {
      if (!seen.has(s.id) && s.status === "PUBLISHED") {
        seen.add(s.id);
        list.push(s);
      }
    }
    return list;
  }

  public listAdminSurveys(params?: { type?: string; status?: string; search?: string }): any[] {
    const seen = new Set<string>();
    const list: any[] = [];

    const searchLower = params?.search?.trim().toLowerCase();
    const statusFilter = params?.status && params.status !== "ALL" ? params.status : null;
    const typeFilter = params?.type && params.type !== "ALL" ? params.type : null;

    for (const s of this.surveys.values()) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);

      if (statusFilter && s.status !== statusFilter) continue;
      if (typeFilter && s.survey_type !== typeFilter) continue;
      if (
        searchLower &&
        !s.title.toLowerCase().includes(searchLower) &&
        !s.survey_id.toLowerCase().includes(searchLower) &&
        !s.category.toLowerCase().includes(searchLower)
      ) {
        continue;
      }

      list.push({
        ...s,
        questions_count: s.questions.length,
        completions_count: s.responses_count,
        in_progress_count: 12,
      });
    }

    return list;
  }

  public getSurvey(idOrCode: string): DummySurvey | null {
    return this.surveys.get(idOrCode) || null;
  }

  public createSurvey(data: any): DummySurvey {
    const id = `surv-${crypto.randomBytes(4).toString("hex")}`;
    const newSurvey: DummySurvey = {
      id,
      survey_id: data.surveyId || `SURV-${Date.now().toString(36).toUpperCase()}`,
      title: data.title,
      description: data.description || "",
      category: data.category || "General",
      survey_type: data.surveyType || "STATIC",
      language: data.language || "en",
      estimated_duration_min: data.estimatedDurationMin || 5,
      internal_objective: data.internalObjective,
      sponsor_details: data.sponsorDetails,
      reward_coins: data.rewardCoins ?? 50,
      response_quota: data.responseQuota || 500,
      responses_count: 0,
      allow_resume: data.allowResume !== false,
      allow_review: data.allowReview === true,
      status: "DRAFT",
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      questions: [],
    };

    this.surveys.set(newSurvey.id, newSurvey);
    this.surveys.set(newSurvey.survey_id, newSurvey);
    return newSurvey;
  }

  public updateSurvey(id: string, data: Partial<DummySurvey>): DummySurvey | null {
    const existing = this.getSurvey(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    this.surveys.set(existing.id, updated);
    this.surveys.set(existing.survey_id, updated);
    return updated;
  }

  public updateSurveyStatus(
    id: string,
    newStatus: DummySurvey["status"]
  ): DummySurvey | null {
    const existing = this.getSurvey(id);
    if (!existing) return null;

    existing.status = newStatus;
    if (newStatus === "PUBLISHED" && !existing.published_at) {
      existing.published_at = new Date().toISOString();
    }
    existing.updated_at = new Date().toISOString();

    this.surveys.set(existing.id, existing);
    this.surveys.set(existing.survey_id, existing);
    return existing;
  }

  public saveSurveyQuestions(surveyId: string, questions: DummySurveyQuestion[]): DummySurveyQuestion[] {
    const survey = this.getSurvey(surveyId);
    if (!survey) return [];

    survey.questions = questions.map((q, idx) => ({
      ...q,
      id: q.id || `q_${idx + 1}`,
      surveyId: survey.id,
      orderNum: q.orderNum ?? idx + 1,
    }));
    survey.updated_at = new Date().toISOString();

    this.surveys.set(survey.id, survey);
    this.surveys.set(survey.survey_id, survey);
    return survey.questions;
  }

  public deleteSurvey(id: string): boolean {
    const survey = this.getSurvey(id);
    if (!survey) return false;
    this.surveys.delete(survey.id);
    this.surveys.delete(survey.survey_id);
    return true;
  }

  public duplicateSurvey(surveyId: string): DummySurvey | null {
    const original = this.getSurvey(surveyId);
    if (!original) return null;

    const newId = `surv-${crypto.randomBytes(4).toString("hex")}`;
    const duplicated: DummySurvey = {
      ...original,
      id: newId,
      survey_id: `${original.survey_id}-COPY`,
      title: `${original.title} (Copy)`,
      status: "DRAFT",
      responses_count: 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: undefined,
      questions: original.questions.map((q) => ({ ...q, id: `q_${crypto.randomBytes(3).toString("hex")}` })),
    };

    this.surveys.set(duplicated.id, duplicated);
    this.surveys.set(duplicated.survey_id, duplicated);
    return duplicated;
  }

  // Respondent Attempts
  public getAttempt(attemptId: string): DummySurveyAttempt | null {
    return this.attempts.get(attemptId) || null;
  }

  public findAttempt(surveyId: string, customerId: string): DummySurveyAttempt | null {
    const survey = this.getSurvey(surveyId);
    const targetId = survey?.id || surveyId;

    for (const a of this.attempts.values()) {
      if ((a.survey_id === targetId || a.survey_id === surveyId) && a.customer_id === customerId) {
        return a;
      }
    }
    return null;
  }

  public startOrResumeAttempt(
    surveyId: string,
    customerId: string
  ): { attempt: DummySurveyAttempt | null; isResume: boolean; isCompleted: boolean; error?: string } {
    const survey = this.getSurvey(surveyId);
    if (!survey) {
      return { attempt: null, isResume: false, isCompleted: false, error: "Survey not found." };
    }

    const existing = this.findAttempt(survey.id, customerId);
    if (existing) {
      if (existing.status === "COMPLETED") {
        return { attempt: existing, isResume: false, isCompleted: true };
      }
      existing.last_saved_at = new Date().toISOString();
      return { attempt: existing, isResume: true, isCompleted: false };
    }

    const newAttempt: DummySurveyAttempt = {
      id: `att_${crypto.randomUUID()}`,
      survey_id: survey.id,
      customer_id: customerId,
      status: "IN_PROGRESS",
      answers: {},
      question_path: [],
      reward_coins: survey.reward_coins,
      reward_issued: false,
      started_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
    };

    this.attempts.set(newAttempt.id, newAttempt);
    return { attempt: newAttempt, isResume: false, isCompleted: false };
  }

  public saveAttemptAutosave(
    attemptId: string,
    customerId: string,
    answers: Record<string, any>,
    currentQuestionId?: string,
    questionPath?: string[]
  ): { success: boolean; attempt?: DummySurveyAttempt; error?: string } {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.customer_id !== customerId) {
      return { success: false, error: "Attempt not found or unauthorized." };
    }

    attempt.answers = { ...attempt.answers, ...answers };
    attempt.current_question_id = currentQuestionId || attempt.current_question_id;
    attempt.question_path = questionPath || attempt.question_path;
    attempt.last_saved_at = new Date().toISOString();

    return { success: true, attempt };
  }

  public submitAttempt(
    attemptId: string,
    customerId: string,
    finalAnswers: Record<string, any>
  ): { success: boolean; coinsAwarded: number; status: string; message: string } {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.customer_id !== customerId) {
      return { success: false, coinsAwarded: 0, status: "ERROR", message: "Attempt not found." };
    }

    const survey = this.getSurvey(attempt.survey_id);
    const coins = survey?.reward_coins || attempt.reward_coins || 50;

    attempt.status = "COMPLETED";
    attempt.answers = { ...attempt.answers, ...finalAnswers };
    attempt.reward_coins = coins;
    attempt.reward_issued = true;
    attempt.completed_at = new Date().toISOString();

    if (survey) {
      survey.responses_count = (survey.responses_count || 0) + 1;
    }

    return {
      success: true,
      coinsAwarded: coins,
      status: "COMPLETED",
      message: `Survey completed! +${coins} coins added to your wallet.`,
    };
  }
}

export const dummySurveyStore = DummySurveyStore.getInstance();
