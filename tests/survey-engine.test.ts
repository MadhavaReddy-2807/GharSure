import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  evaluateBranchRule,
  validateAnswerValue,
  computeApplicableQuestions,
  invalidateDownstreamAnswers,
  validateSurveyDefinition,
  SurveyQuestion,
  BranchRule,
} from "../src/lib/survey-engine";

describe("GharSure Survey Engine", () => {
  // ---------------------------------------------------------------------------
  // 1. QUESTION TYPE VALIDATION (11+ Question Types)
  // ---------------------------------------------------------------------------
  describe("Question Type Answer Validation", () => {
    it("validates SINGLE_CHOICE answer must belong to configured options", () => {
      const q: SurveyQuestion = {
        id: "q_water_source",
        orderNum: 1,
        questionText: "What is your primary water source?",
        questionType: "SINGLE_CHOICE",
        options: ["Borewell", "Municipal Supply", "Tanker Water"],
        isRequired: true,
      };

      expect(validateAnswerValue(q, "Borewell").isValid).toBe(true);
      expect(validateAnswerValue(q, "Municipal Supply").isValid).toBe(true);
      expect(validateAnswerValue(q, "River Water").isValid).toBe(false);
      expect(validateAnswerValue(q, null).isValid).toBe(false);
    });

    it("validates MULTIPLE_CHOICE answers must be array and match options", () => {
      const q: SurveyQuestion = {
        id: "q_appliances",
        orderNum: 2,
        questionText: "Which appliances do you own?",
        questionType: "MULTIPLE_CHOICE",
        options: ["Water Purifier", "Washing Machine", "Geyser", "Refrigerator"],
        isRequired: true,
      };

      expect(validateAnswerValue(q, ["Water Purifier", "Geyser"]).isValid).toBe(true);
      expect(validateAnswerValue(q, []).isValid).toBe(false); // isRequired: true
      expect(validateAnswerValue(q, ["Water Purifier", "Tesla"]).isValid).toBe(false);
      expect(validateAnswerValue(q, "Water Purifier").isValid).toBe(false); // must be array
    });

    it("validates DROPDOWN choice answers", () => {
      const q: SurveyQuestion = {
        id: "q_city",
        orderNum: 3,
        questionText: "Select your city",
        questionType: "DROPDOWN",
        options: ["Bangalore", "Mumbai", "Delhi NCR", "Pune"],
        isRequired: true,
      };

      expect(validateAnswerValue(q, "Bangalore").isValid).toBe(true);
      expect(validateAnswerValue(q, "London").isValid).toBe(false);
    });

    it("validates SHORT_TEXT with pattern and length constraints", () => {
      const q: SurveyQuestion = {
        id: "q_pincode",
        orderNum: 4,
        questionText: "Enter your 6-digit PIN code",
        questionType: "SHORT_TEXT",
        isRequired: true,
        validationRules: {
          min: 6,
          max: 6,
          pattern: "^[1-9][0-9]{5}$",
          customErrorMessage: "Please enter a valid 6-digit Indian PIN code",
        },
      };

      expect(validateAnswerValue(q, "560100").isValid).toBe(true);
      expect(validateAnswerValue(q, "012345").isValid).toBe(false); // starts with 0
      expect(validateAnswerValue(q, "56010").isValid).toBe(false); // too short
      expect(validateAnswerValue(q, "5601009").isValid).toBe(false); // too long
    });

    it("validates LONG_TEXT with min character count", () => {
      const q: SurveyQuestion = {
        id: "q_feedback",
        orderNum: 5,
        questionText: "Describe your experience with hard water scaling",
        questionType: "LONG_TEXT",
        isRequired: true,
        validationRules: { min: 15 },
      };

      expect(validateAnswerValue(q, "White scaling is everywhere on my bathroom taps").isValid).toBe(true);
      expect(validateAnswerValue(q, "Too bad").isValid).toBe(false); // below 15 chars
    });

    it("validates NUMBER within range constraints", () => {
      const q: SurveyQuestion = {
        id: "q_tds",
        orderNum: 6,
        questionText: "What is your measured TDS level (ppm)?",
        questionType: "NUMBER",
        isRequired: true,
        validationRules: { min: 10, max: 3000 },
      };

      expect(validateAnswerValue(q, 450).isValid).toBe(true);
      expect(validateAnswerValue(q, "650").isValid).toBe(true); // numeric string parsed
      expect(validateAnswerValue(q, 5).isValid).toBe(false); // below min
      expect(validateAnswerValue(q, 5000).isValid).toBe(false); // above max
      expect(validateAnswerValue(q, "abc").isValid).toBe(false); // NaN
    });

    it("validates YES_NO boolean values", () => {
      const q: SurveyQuestion = {
        id: "q_has_ro",
        orderNum: 7,
        questionText: "Do you have an RO Water Purifier installed?",
        questionType: "YES_NO",
        isRequired: true,
      };

      expect(validateAnswerValue(q, true).isValid).toBe(true);
      expect(validateAnswerValue(q, false).isValid).toBe(true);
      expect(validateAnswerValue(q, "YES").isValid).toBe(true);
      expect(validateAnswerValue(q, "NO").isValid).toBe(true);
      expect(validateAnswerValue(q, "maybe").isValid).toBe(false);
    });

    it("validates RATING_SCALE and STAR_RATING (1-5 or 1-10)", () => {
      const qRating: SurveyQuestion = {
        id: "q_satisfaction",
        orderNum: 8,
        questionText: "Rate your satisfaction from 1 to 5",
        questionType: "STAR_RATING",
        isRequired: true,
        validationRules: { min: 1, max: 5 },
      };

      expect(validateAnswerValue(qRating, 5).isValid).toBe(true);
      expect(validateAnswerValue(qRating, 1).isValid).toBe(true);
      expect(validateAnswerValue(qRating, 0).isValid).toBe(false);
      expect(validateAnswerValue(qRating, 6).isValid).toBe(false);
    });

    it("validates DATE format", () => {
      const qDate: SurveyQuestion = {
        id: "q_install_date",
        orderNum: 9,
        questionText: "When was your purifier installed?",
        questionType: "DATE",
        isRequired: true,
      };

      expect(validateAnswerValue(qDate, "2026-05-15").isValid).toBe(true);
      expect(validateAnswerValue(qDate, "not-a-date").isValid).toBe(false);
      expect(validateAnswerValue(qDate, null).isValid).toBe(false);
    });

    it("validates MATRIX / Grid questions require every row to be rated", () => {
      const qMatrix: SurveyQuestion = {
        id: "q_service_ratings",
        orderNum: 10,
        questionText: "Rate each aspect of our service",
        questionType: "MATRIX",
        options: {
          matrixRows: ["Speed", "Quality", "Politeness"],
          matrixCols: ["Poor", "Good", "Excellent"],
        },
        isRequired: true,
      };

      const completeAnswer = {
        Speed: "Good",
        Quality: "Excellent",
        Politeness: "Good",
      };
      expect(validateAnswerValue(qMatrix, completeAnswer).isValid).toBe(true);

      const incompleteAnswer = {
        Speed: "Good",
        Quality: "Excellent",
      }; // missing Politeness
      expect(validateAnswerValue(qMatrix, incompleteAnswer).isValid).toBe(false);
    });

    it("allows optional questions to be left empty", () => {
      const qOptional: SurveyQuestion = {
        id: "q_notes",
        orderNum: 11,
        questionText: "Any other comments? (Optional)",
        questionType: "SHORT_TEXT",
        isRequired: false,
      };

      expect(validateAnswerValue(qOptional, "").isValid).toBe(true);
      expect(validateAnswerValue(qOptional, null).isValid).toBe(true);
      expect(validateAnswerValue(qOptional, undefined).isValid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CONDITION AND OPERATOR EVALUATION
  // ---------------------------------------------------------------------------
  describe("Rule Condition Engine & Operators", () => {
    it("evaluates EQUALS and NOT_EQUALS operators", () => {
      const answers = { q1: "Borewell", q2: 500 };

      expect(evaluateCondition({ questionId: "q1", operator: "EQUALS", value: "Borewell" }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "q1", operator: "EQUALS", value: "Municipal" }, answers)).toBe(false);
      expect(evaluateCondition({ questionId: "q1", operator: "NOT_EQUALS", value: "Municipal" }, answers)).toBe(true);
    });

    it("evaluates CONTAINS and DOES_NOT_CONTAIN on strings and arrays", () => {
      const answers = {
        hobbies: ["Plumbing", "Carpentry", "Electrical"],
        feedback: "Water purifier filter is leaking",
      };

      expect(evaluateCondition({ questionId: "hobbies", operator: "CONTAINS", value: "Plumbing" }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "hobbies", operator: "CONTAINS", value: "Gardening" }, answers)).toBe(false);
      expect(evaluateCondition({ questionId: "feedback", operator: "CONTAINS", value: "filter" }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "feedback", operator: "DOES_NOT_CONTAIN", value: "smoke" }, answers)).toBe(true);
    });

    it("evaluates numeric comparison operators (>, <, >=, <=)", () => {
      const answers = { tds: 650 };

      expect(evaluateCondition({ questionId: "tds", operator: "GREATER_THAN", value: 500 }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "tds", operator: "GREATER_THAN", value: 800 }, answers)).toBe(false);
      expect(evaluateCondition({ questionId: "tds", operator: "GREATER_THAN_OR_EQUAL", value: 650 }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "tds", operator: "LESS_THAN", value: 700 }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "tds", operator: "LESS_THAN_OR_EQUAL", value: 650 }, answers)).toBe(true);
    });

    it("evaluates IS_ANSWERED and IS_NOT_ANSWERED operators", () => {
      const answers = { answeredField: "Yes", emptyField: "" };

      expect(evaluateCondition({ questionId: "answeredField", operator: "IS_ANSWERED" }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "emptyField", operator: "IS_ANSWERED" }, answers)).toBe(false);
      expect(evaluateCondition({ questionId: "unseenField", operator: "IS_NOT_ANSWERED" }, answers)).toBe(true);
    });

    it("evaluates IN and NOT_IN operators", () => {
      const answers = { city: "Bangalore" };

      expect(evaluateCondition({ questionId: "city", operator: "IN", value: ["Bangalore", "Pune"] }, answers)).toBe(true);
      expect(evaluateCondition({ questionId: "city", operator: "IN", value: ["Mumbai", "Delhi"] }, answers)).toBe(false);
      expect(evaluateCondition({ questionId: "city", operator: "NOT_IN", value: ["Mumbai", "Delhi"] }, answers)).toBe(true);
    });

    it("supports multi-condition grouping (ALL / AND, ANY / OR)", () => {
      const answers = { ownsPurifier: true, tds: 450, city: "Bangalore" };

      const allRule: BranchRule = {
        conditions: [
          { questionId: "ownsPurifier", operator: "EQUALS", value: true },
          { questionId: "tds", operator: "GREATER_THAN", value: 400 },
        ],
        matchType: "ALL",
        action: "SKIP_TO_QUESTION",
        targetQuestionId: "q_purifier_details",
      };
      expect(evaluateBranchRule(allRule, answers)).toBe(true);

      const anyRule: BranchRule = {
        conditions: [
          { questionId: "city", operator: "EQUALS", value: "Mumbai" },
          { questionId: "ownsPurifier", operator: "EQUALS", value: true },
        ],
        matchType: "ANY",
        action: "SKIP_TO_QUESTION",
        targetQuestionId: "q_purifier_details",
      };
      expect(evaluateBranchRule(anyRule, answers)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. DECISION-BASED SURVEY NAVIGATION & JUMPS
  // ---------------------------------------------------------------------------
  describe("Decision-Based Survey Branching & Navigation", () => {
    const surveyQuestions: SurveyQuestion[] = [
      {
        id: "q1_own_purifier",
        orderNum: 1,
        questionText: "Do you own a water purifier?",
        questionType: "YES_NO",
        isRequired: true,
        branchingRules: [
          {
            conditions: [{ questionId: "q1_own_purifier", operator: "EQUALS", value: false }],
            matchType: "ALL",
            action: "SKIP_TO_QUESTION",
            targetQuestionId: "q3_purchase_intent",
          },
        ],
      },
      {
        id: "q2_purifier_brand",
        orderNum: 2,
        questionText: "Which brand of water purifier do you own?",
        questionType: "SINGLE_CHOICE",
        options: ["Kent", "Aquaguard", "Pureit", "Other"],
        isRequired: true,
      },
      {
        id: "q3_purchase_intent",
        orderNum: 3,
        questionText: "Are you planning to install a purifier in the next 3 months?",
        questionType: "YES_NO",
        isRequired: true,
      },
      {
        id: "q4_city",
        orderNum: 4,
        questionText: "What city are you based in?",
        questionType: "SINGLE_CHOICE",
        options: ["Bangalore", "Other"],
        isRequired: true,
        branchingRules: [
          {
            conditions: [{ questionId: "q4_city", operator: "EQUALS", value: "Other" }],
            matchType: "ALL",
            action: "DISQUALIFY",
            disqualificationReason: "This trial campaign is currently restricted to Bangalore residents.",
          },
        ],
      },
    ];

    it("includes question Q2 when Q1 is YES", () => {
      const answers = { q1_own_purifier: true };
      const evalResult = computeApplicableQuestions(surveyQuestions, answers, "DECISION_BASED");
      const ids = evalResult.applicableQuestions.map((q) => q.id);

      expect(ids).toContain("q1_own_purifier");
      expect(ids).toContain("q2_purifier_brand");
      expect(ids).toContain("q3_purchase_intent");
      expect(ids).toContain("q4_city");
      expect(evalResult.isTerminated).toBe(false);
    });

    it("skips question Q2 when Q1 is NO (branches directly to Q3)", () => {
      const answers = { q1_own_purifier: false };
      const evalResult = computeApplicableQuestions(surveyQuestions, answers, "DECISION_BASED");
      const ids = evalResult.applicableQuestions.map((q) => q.id);

      expect(ids).toContain("q1_own_purifier");
      expect(ids).not.toContain("q2_purifier_brand");
      expect(ids).toContain("q3_purchase_intent");
      expect(ids).toContain("q4_city");
      expect(evalResult.isTerminated).toBe(false);
    });

    it("triggers DISQUALIFY early termination outcome with configured reason", () => {
      const answers = {
        q1_own_purifier: false,
        q3_purchase_intent: true,
        q4_city: "Other",
      };
      const evalResult = computeApplicableQuestions(surveyQuestions, answers, "DECISION_BASED");

      expect(evalResult.isTerminated).toBe(true);
      expect(evalResult.terminationOutcome).toBe("DISQUALIFIED");
      expect(evalResult.terminationReason).toBe(
        "This trial campaign is currently restricted to Bangalore residents."
      );
    });

    it("triggers END_SURVEY early completion outcome", () => {
      const earlyEndQuestions: SurveyQuestion[] = [
        {
          id: "q_registered",
          orderNum: 1,
          questionText: "Are you already an enterprise partner?",
          questionType: "YES_NO",
          isRequired: true,
          branchingRules: [
            {
              id: "r_end",
              conditions: [{ questionId: "q_registered", operator: "EQUALS", value: true }],
              matchType: "ALL",
              action: "END_SURVEY",
            } as any,
          ],
        },
        {
          id: "q_unregistered_questions",
          orderNum: 2,
          questionText: "Tell us about your home",
          questionType: "SHORT_TEXT",
          isRequired: true,
        },
      ];

      const answers = { q_registered: true };
      const evalResult = computeApplicableQuestions(earlyEndQuestions, answers, "DECISION_BASED");

      expect(evalResult.isTerminated).toBe(true);
      expect(evalResult.terminationOutcome).toBe("COMPLETED");
      expect(evalResult.applicableQuestions.map((q) => q.id)).toEqual(["q_registered"]);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DOWNSTREAM ANSWER INVALIDATION ON ANSWER CHANGE
  // ---------------------------------------------------------------------------
  describe("Downstream Answer Invalidation", () => {
    const surveyQuestions: SurveyQuestion[] = [
      {
        id: "q1_own_purifier",
        orderNum: 1,
        questionText: "Do you own a water purifier?",
        questionType: "YES_NO",
        isRequired: true,
        branchingRules: [
          {
            id: "r1",
            conditions: [{ questionId: "q1_own_purifier", operator: "EQUALS", value: false }],
            matchType: "ALL",
            action: "SKIP_TO_QUESTION",
            targetQuestionId: "q3_interest",
          } as any,
        ],
      },
      {
        id: "q2_purifier_brand",
        orderNum: 2,
        questionText: "Which brand of water purifier do you own?",
        questionType: "SINGLE_CHOICE",
        options: ["Kent", "Aquaguard", "Pureit"],
        isRequired: true,
      },
      {
        id: "q3_interest",
        orderNum: 3,
        questionText: "Are you interested in a water test kit?",
        questionType: "YES_NO",
        isRequired: true,
      },
    ];

    it("purges answers from skipped questions when parent answer toggles to false", () => {
      // User initially answered YES and picked Kent for Q2
      const initialAnswers = {
        q1_own_purifier: true,
        q2_purifier_brand: "Kent",
        q3_interest: true,
      };

      // User backtracks and changes Q1 to NO (meaning Q2 is no longer applicable)
      const modifiedAnswers = {
        ...initialAnswers,
        q1_own_purifier: false,
      };

      const { cleanedAnswers, purgedQuestionIds } = invalidateDownstreamAnswers(
        surveyQuestions,
        modifiedAnswers,
        "DECISION_BASED"
      );

      expect(purgedQuestionIds).toContain("q2_purifier_brand");
      expect(cleanedAnswers.q2_purifier_brand).toBeUndefined();
      expect(cleanedAnswers.q1_own_purifier).toBe(false);
      expect(cleanedAnswers.q3_interest).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GRAPH VALIDATION & PRE-FLIGHT CHECKS
  // ---------------------------------------------------------------------------
  describe("Pre-flight Graph Validation & Loop Detection", () => {
    it("flags error if question text is missing", () => {
      const invalid: SurveyQuestion[] = [
        {
          id: "q1",
          orderNum: 1,
          questionText: "   ",
          questionType: "SHORT_TEXT",
          isRequired: true,
        },
      ];

      const res = validateSurveyDefinition(invalid, "STATIC");
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Question 1 is missing question text"))).toBe(true);
    });

    it("flags error if choice question has fewer than 2 options", () => {
      const invalid: SurveyQuestion[] = [
        {
          id: "q1",
          orderNum: 1,
          questionText: "Pick an option",
          questionType: "SINGLE_CHOICE",
          options: ["Only one option"],
          isRequired: true,
        },
      ];

      const res = validateSurveyDefinition(invalid, "STATIC");
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("must have at least 2 options"))).toBe(true);
    });

    it("flags error if branching rule references a non-existent target question", () => {
      const invalid: SurveyQuestion[] = [
        {
          id: "q1",
          orderNum: 1,
          questionText: "Do you own a car?",
          questionType: "YES_NO",
          isRequired: true,
          branchingRules: [
            {
              conditions: [{ questionId: "q1", operator: "EQUALS", value: true }],
              matchType: "ALL",
              action: "SKIP_TO_QUESTION",
              targetQuestionId: "q_does_not_exist",
            },
          ],
        },
      ];

      const res = validateSurveyDefinition(invalid, "DECISION_BASED");
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("non-existent target question"))).toBe(true);
    });

    it("flags error if a circular jump loop is detected (Q1 -> Q2 -> Q1)", () => {
      const loopQuestions: SurveyQuestion[] = [
        {
          id: "q1",
          orderNum: 1,
          questionText: "Question 1",
          questionType: "YES_NO",
          isRequired: true,
          branchingRules: [
            {
              conditions: [{ questionId: "q1", operator: "EQUALS", value: true }],
              matchType: "ALL",
              action: "SKIP_TO_QUESTION",
              targetQuestionId: "q2",
            },
          ],
        },
        {
          id: "q2",
          orderNum: 2,
          questionText: "Question 2",
          questionType: "YES_NO",
          isRequired: true,
          branchingRules: [
            {
              conditions: [{ questionId: "q2", operator: "EQUALS", value: true }],
              matchType: "ALL",
              action: "SKIP_TO_QUESTION",
              targetQuestionId: "q1", // jumps backwards creating cycle
            },
          ],
        },
      ];

      const res = validateSurveyDefinition(loopQuestions, "DECISION_BASED");
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.toLowerCase().includes("cycle") || e.toLowerCase().includes("loop"))).toBe(true);
    });

    it("approves well-formed survey definitions", () => {
      const valid: SurveyQuestion[] = [
        {
          id: "q1",
          orderNum: 1,
          questionText: "What is your main water issue?",
          questionType: "SINGLE_CHOICE",
          options: ["Hard Water Scaling", "Bad Odour", "Low Pressure"],
          isRequired: true,
        },
        {
          id: "q2",
          orderNum: 2,
          questionText: "Would you like a free water hardness testing kit?",
          questionType: "YES_NO",
          isRequired: true,
        },
      ];

      const res = validateSurveyDefinition(valid, "STATIC");
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PROGRESS PERCENTAGE COMPUTATION
  // ---------------------------------------------------------------------------
  describe("Progress Percentage Computation", () => {
    it("computes progress based on applicable questions in the path", () => {
      const questions: SurveyQuestion[] = [
        { id: "q1", orderNum: 1, questionText: "Q1", questionType: "YES_NO", isRequired: true },
        { id: "q2", orderNum: 2, questionText: "Q2", questionType: "YES_NO", isRequired: true },
        { id: "q3", orderNum: 3, questionText: "Q3", questionType: "YES_NO", isRequired: true },
        { id: "q4", orderNum: 4, questionText: "Q4", questionType: "YES_NO", isRequired: true },
      ];

      // At start (0 answered)
      const res0 = computeApplicableQuestions(questions, {}, "STATIC");
      const answered0 = res0.applicableQuestions.filter((q) => validateAnswerValue(q, ({} as any)[q.id]).isValid).length;
      expect(Math.round((answered0 / res0.applicableQuestions.length) * 100)).toBe(0);

      // 2 answered of 4
      const answers2 = { q1: true, q2: false };
      const res2 = computeApplicableQuestions(questions, answers2, "STATIC");
      const answered2 = res2.applicableQuestions.filter((q) => validateAnswerValue(q, (answers2 as any)[q.id]).isValid).length;
      expect(Math.round((answered2 / res2.applicableQuestions.length) * 100)).toBe(50);

      // All 4 answered
      const answers4 = { q1: true, q2: false, q3: true, q4: true };
      const res4 = computeApplicableQuestions(questions, answers4, "STATIC");
      const answered4 = res4.applicableQuestions.filter((q) => validateAnswerValue(q, (answers4 as any)[q.id]).isValid).length;
      expect(Math.round((answered4 / res4.applicableQuestions.length) * 100)).toBe(100);
    });
  });
});
