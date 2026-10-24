/**
 * GharSure Advanced Survey & Decision Engine
 * Reference: SurveyKing pattern adapted for GharSure architecture.
 * Supports Static and Decision-Based Surveys, Multi-Condition Branching,
 * 11+ Question Types, Answer Invalidation, Graph Validation, and Progress Tracking.
 */

export type SurveyType = "STATIC" | "DECISION_BASED";

export type QuestionType =
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

export type Operator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "DOES_NOT_CONTAIN"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN_OR_EQUAL"
  | "IS_ANSWERED"
  | "IS_NOT_ANSWERED"
  | "IN"
  | "NOT_IN";

export type BranchAction =
  | "SHOW_QUESTION"
  | "HIDE_QUESTION"
  | "SKIP_TO_QUESTION"
  | "BRANCH_TO_SECTION"
  | "END_SURVEY"
  | "DISQUALIFY";

export interface Condition {
  questionId: string;
  operator: Operator;
  value?: any;
}

export interface ConditionGroup {
  logic: "AND" | "OR";
  conditions: Condition[];
}

export interface BranchingRule {
  id?: string;
  conditionGroup?: ConditionGroup;
  conditions?: Condition[];
  matchType?: "ALL" | "ANY";
  logic?: "AND" | "OR";
  action: BranchAction;
  targetQuestionId?: string;
  targetSectionId?: string;
  disqualificationReason?: string;
  completionMessage?: string;
}

export type BranchRule = BranchingRule;

export interface QuestionValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customErrorMessage?: string;
}

export interface SurveyQuestion {
  id: string;
  surveyId?: string;
  orderNum: number;
  questionText: string;
  questionType: QuestionType;
  description?: string | null;
  options?: any; // string[] or { label: string; value: string }[] or matrix definitions { matrixRows: string[]; matrixCols: string[] }
  isRequired: boolean;
  validationRules?: QuestionValidationRules;
  branchingRules?: BranchingRule[];
  sectionName?: string | null;
}

export interface SurveyAttemptRecord {
  id: string;
  survey_id: string;
  customer_id: string;
  survey_version_id?: string | null;
  status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "DISQUALIFIED" | "SCREENED_OUT" | "ABANDONED";
  answers: Record<string, any>;
  current_question_id?: string | null;
  question_path: string[];
  reward_issued: boolean;
  reward_coins: number;
  disqualification_reason?: string | null;
  started_at: string;
  last_saved_at: string;
  completed_at?: string | null;
}

// -----------------------------------------------------------------------------
// 1. Condition & Logic Evaluation
// -----------------------------------------------------------------------------

export function evaluateCondition(condition: Condition, answers: Record<string, any>): boolean {
  const answer = answers[condition.questionId];

  switch (condition.operator) {
    case "IS_ANSWERED":
      return answer !== undefined && answer !== null && answer !== "" && (!Array.isArray(answer) || answer.length > 0);

    case "IS_NOT_ANSWERED":
      return answer === undefined || answer === null || answer === "" || (Array.isArray(answer) && answer.length === 0);

    case "EQUALS": {
      if (answer === undefined || answer === null) return false;
      if (typeof answer === "boolean" || typeof condition.value === "boolean") {
        return Boolean(answer) === Boolean(condition.value);
      }
      return String(answer).trim().toLowerCase() === String(condition.value).trim().toLowerCase();
    }

    case "NOT_EQUALS": {
      if (answer === undefined || answer === null) return true;
      if (typeof answer === "boolean" || typeof condition.value === "boolean") {
        return Boolean(answer) !== Boolean(condition.value);
      }
      return String(answer).trim().toLowerCase() !== String(condition.value).trim().toLowerCase();
    }

    case "CONTAINS": {
      if (Array.isArray(answer)) {
        return answer.some((item) => String(item).toLowerCase() === String(condition.value).toLowerCase());
      }
      if (typeof answer === "string") {
        return answer.toLowerCase().includes(String(condition.value).toLowerCase());
      }
      return false;
    }

    case "DOES_NOT_CONTAIN": {
      if (Array.isArray(answer)) {
        return !answer.some((item) => String(item).toLowerCase() === String(condition.value).toLowerCase());
      }
      if (typeof answer === "string") {
        return !answer.toLowerCase().includes(String(condition.value).toLowerCase());
      }
      return true;
    }

    case "GREATER_THAN": {
      const numAnswer = Number(answer);
      const numTarget = Number(condition.value);
      return !isNaN(numAnswer) && !isNaN(numTarget) && numAnswer > numTarget;
    }

    case "LESS_THAN": {
      const numAnswer = Number(answer);
      const numTarget = Number(condition.value);
      return !isNaN(numAnswer) && !isNaN(numTarget) && numAnswer < numTarget;
    }

    case "GREATER_THAN_OR_EQUAL": {
      const numAnswer = Number(answer);
      const numTarget = Number(condition.value);
      return !isNaN(numAnswer) && !isNaN(numTarget) && numAnswer >= numTarget;
    }

    case "LESS_THAN_OR_EQUAL": {
      const numAnswer = Number(answer);
      const numTarget = Number(condition.value);
      return !isNaN(numAnswer) && !isNaN(numTarget) && numAnswer <= numTarget;
    }

    case "IN": {
      const targetList = Array.isArray(condition.value) ? condition.value : [condition.value];
      return targetList.some((item) => String(item).toLowerCase() === String(answer).toLowerCase());
    }

    case "NOT_IN": {
      const targetList = Array.isArray(condition.value) ? condition.value : [condition.value];
      return !targetList.some((item) => String(item).toLowerCase() === String(answer).toLowerCase());
    }

    default:
      return false;
  }
}

export function evaluateConditionGroup(group: ConditionGroup, answers: Record<string, any>): boolean {
  if (!group || !group.conditions || group.conditions.length === 0) {
    return true;
  }

  if (group.logic === "OR") {
    return group.conditions.some((c) => evaluateCondition(c, answers));
  } else {
    // Default to AND
    return group.conditions.every((c) => evaluateCondition(c, answers));
  }
}

export function evaluateBranchRule(rule: any, answers: Record<string, any>): boolean {
  if (!rule) return true;
  if (rule.conditionGroup) {
    return evaluateConditionGroup(rule.conditionGroup, answers);
  }
  if (rule.conditions && Array.isArray(rule.conditions)) {
    const isOr = rule.matchType === "ANY" || rule.logic === "OR";
    return evaluateConditionGroup({ logic: isOr ? "OR" : "AND", conditions: rule.conditions }, answers);
  }
  return true;
}

// -----------------------------------------------------------------------------
// 2. Applicable Questions & Branch Navigation Computation
// -----------------------------------------------------------------------------

export interface NavigationEvaluationResult {
  applicableQuestions: SurveyQuestion[];
  isTerminated: boolean;
  terminationOutcome?: "COMPLETED" | "DISQUALIFIED";
  terminationReason?: string;
  skippedQuestionIds: Set<string>;
  hiddenQuestionIds: Set<string>;
}

export function computeApplicableQuestions(
  questions: SurveyQuestion[],
  answers: Record<string, any>,
  surveyType: SurveyType
): NavigationEvaluationResult {
  const sorted = [...questions].sort((a, b) => a.orderNum - b.orderNum);
  const applicable: SurveyQuestion[] = [];
  const hiddenQuestionIds = new Set<string>();
  const skippedQuestionIds = new Set<string>();

  if (surveyType === "STATIC") {
    // In static mode, all questions are sequentially applicable
    return {
      applicableQuestions: sorted,
      isTerminated: false,
      skippedQuestionIds,
      hiddenQuestionIds,
    };
  }

  // Decision-based branching evaluation
  let currentIndex = 0;
  while (currentIndex < sorted.length) {
    const currentQ = sorted[currentIndex];

    // Check if current question was marked hidden by an earlier rule
    if (hiddenQuestionIds.has(currentQ.id)) {
      currentIndex++;
      continue;
    }

    applicable.push(currentQ);

    // Evaluate branching rules for this question
    const rules = currentQ.branchingRules || [];
    let hasJumped = false;

    for (const rule of rules) {
      const matches = evaluateBranchRule(rule, answers);
      if (!matches) continue;

      if (rule.action === "DISQUALIFY") {
        return {
          applicableQuestions: applicable,
          isTerminated: true,
          terminationOutcome: "DISQUALIFIED",
          terminationReason: rule.disqualificationReason || "Response criteria not met.",
          skippedQuestionIds,
          hiddenQuestionIds,
        };
      }

      if (rule.action === "END_SURVEY") {
        return {
          applicableQuestions: applicable,
          isTerminated: true,
          terminationOutcome: "COMPLETED",
          terminationReason: rule.completionMessage || "Survey completed early based on responses.",
          skippedQuestionIds,
          hiddenQuestionIds,
        };
      }

      if (rule.action === "HIDE_QUESTION" && rule.targetQuestionId) {
        hiddenQuestionIds.add(rule.targetQuestionId);
      }

      if (rule.action === "SHOW_QUESTION" && rule.targetQuestionId) {
        hiddenQuestionIds.delete(rule.targetQuestionId);
      }

      if (rule.action === "SKIP_TO_QUESTION" && rule.targetQuestionId) {
        const targetIndex = sorted.findIndex((q) => q.id === rule.targetQuestionId);
        if (targetIndex > currentIndex) {
          // Mark in-between questions as skipped
          for (let s = currentIndex + 1; s < targetIndex; s++) {
            skippedQuestionIds.add(sorted[s].id);
          }
          currentIndex = targetIndex;
          hasJumped = true;
          break; // jump to target question
        }
      }
    }

    if (!hasJumped) {
      currentIndex++;
    }
  }

  return {
    applicableQuestions: applicable,
    isTerminated: false,
    skippedQuestionIds,
    hiddenQuestionIds,
  };
}

// -----------------------------------------------------------------------------
// 3. Downstream Answer Invalidation
// -----------------------------------------------------------------------------

/**
 * When a respondent changes an earlier answer, any previously answered questions
 * that are no longer part of the valid branch path must be purged immediately
 * so stale or contradictory answers are not retained.
 */
export function invalidateDownstreamAnswers(
  questions: SurveyQuestion[],
  currentAnswers: Record<string, any>,
  surveyType: SurveyType
): { cleanedAnswers: Record<string, any>; purgedQuestionIds: string[] } {
  if (surveyType === "STATIC") {
    return { cleanedAnswers: { ...currentAnswers }, purgedQuestionIds: [] };
  }

  const { applicableQuestions } = computeApplicableQuestions(questions, currentAnswers, surveyType);
  const applicableIds = new Set(applicableQuestions.map((q) => q.id));

  const cleanedAnswers: Record<string, any> = {};
  const purgedQuestionIds: string[] = [];

  for (const [qId, val] of Object.entries(currentAnswers)) {
    if (applicableIds.has(qId)) {
      cleanedAnswers[qId] = val;
    } else {
      purgedQuestionIds.push(qId);
    }
  }

  return { cleanedAnswers, purgedQuestionIds };
}

// -----------------------------------------------------------------------------
// 4. Graph Integrity & Pre-Flight Validation (Publish-time checks)
// -----------------------------------------------------------------------------

export interface SurveyValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSurveyDefinition(
  questions: SurveyQuestion[],
  surveyType: SurveyType
): SurveyValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!questions || questions.length === 0) {
    errors.push("Survey must contain at least one question.");
    return { isValid: false, errors, warnings };
  }

  const questionIds = new Set(questions.map((q) => q.id));

  questions.forEach((q, idx) => {
    // 1. Validate question text
    if (!q.questionText || !q.questionText.trim()) {
      errors.push(`Question ${idx + 1} is missing question text.`);
    }

    // 2. Validate options for choice-based questions
    const isChoice = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(q.questionType);
    if (isChoice) {
      if (!q.options || q.options.length < 2) {
        errors.push(`Question #${idx + 1} ("${q.questionText || "Untitled"}") must have at least 2 options.`);
      }
    }

    // 3. Validate decision rules for decision-based surveys
    if (surveyType === "DECISION_BASED" && q.branchingRules) {
      q.branchingRules.forEach((rule, rIdx) => {
        // Validate target question reference
        if (["SKIP_TO_QUESTION", "SHOW_QUESTION", "HIDE_QUESTION"].includes(rule.action)) {
          if (!rule.targetQuestionId) {
            errors.push(`Question #${idx + 1}, Rule #${rIdx + 1}: Missing target question destination.`);
          } else if (!questionIds.has(rule.targetQuestionId)) {
            errors.push(`Question #${idx + 1}, Rule #${rIdx + 1}: Target question "${rule.targetQuestionId}" does not exist (non-existent target question).`);
          } else if (rule.targetQuestionId === q.id) {
            errors.push(`Question #${idx + 1}, Rule #${rIdx + 1}: Rule cannot target itself (infinite loop).`);
          }
        }

        // Validate rule condition references
        const conditions = rule.conditionGroup?.conditions || (rule as any).conditions || [];
        conditions.forEach((cond: any, cIdx: number) => {
          if (!questionIds.has(cond.questionId)) {
            errors.push(
              `Question #${idx + 1}, Rule #${rIdx + 1}, Condition #${cIdx + 1}: References unknown question "${cond.questionId}".`
            );
          }
        });
      });
    }
  });

  // Cycle detection in skip targets
  if (surveyType === "DECISION_BASED") {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(qId: string): boolean {
      visited.add(qId);
      stack.add(qId);

      const q = questions.find((item) => item.id === qId);
      if (q && q.branchingRules) {
        for (const rule of q.branchingRules) {
          if (rule.action === "SKIP_TO_QUESTION" && rule.targetQuestionId) {
            if (!visited.has(rule.targetQuestionId)) {
              if (hasCycle(rule.targetQuestionId)) return true;
            } else if (stack.has(rule.targetQuestionId)) {
              return true;
            }
          }
        }
      }

      stack.delete(qId);
      return false;
    }

    for (const q of questions) {
      if (!visited.has(q.id)) {
        if (hasCycle(q.id)) {
          errors.push(`Circular jump loop (cycle detected) starting around question "${q.questionText || q.id}".`);
          break;
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// 5. Answer Value Validation
// -----------------------------------------------------------------------------

export function validateAnswerValue(
  question: SurveyQuestion,
  value: any
): { isValid: boolean; error?: string } {
  const isAnswered =
    value !== undefined &&
    value !== null &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0) &&
    (typeof value !== "object" || Object.keys(value).length > 0);

  if (question.isRequired && !isAnswered) {
    return { isValid: false, error: "This question is required." };
  }

  if (!isAnswered) {
    return { isValid: true }; // Optional & unanswered is valid
  }

  // Type specific validation
  switch (question.questionType) {
    case "NUMBER": {
      const num = Number(value);
      if (isNaN(num)) return { isValid: false, error: "Please enter a valid number." };
      if (question.validationRules?.min !== undefined && num < question.validationRules.min) {
        return { isValid: false, error: `Minimum value is ${question.validationRules.min}.` };
      }
      if (question.validationRules?.max !== undefined && num > question.validationRules.max) {
        return { isValid: false, error: `Maximum value is ${question.validationRules.max}.` };
      }
      break;
    }

    case "SHORT_TEXT":
    case "LONG_TEXT": {
      const str = String(value);
      const minLen = question.validationRules?.minLength ?? question.validationRules?.min;
      const maxLen = question.validationRules?.maxLength ?? question.validationRules?.max;
      if (minLen !== undefined && str.length < minLen) {
        return { isValid: false, error: `Minimum ${minLen} characters required.` };
      }
      if (maxLen !== undefined && str.length > maxLen) {
        return { isValid: false, error: `Maximum ${maxLen} characters allowed.` };
      }
      if (question.validationRules?.pattern) {
        try {
          const reg = new RegExp(question.validationRules.pattern);
          if (!reg.test(str)) {
            return { isValid: false, error: question.validationRules.customErrorMessage || "Invalid input format." };
          }
        } catch {
          // ignore bad regex
        }
      }
      break;
    }

    case "SINGLE_CHOICE":
    case "DROPDOWN": {
      // Must match one of the defined options
      if (Array.isArray(question.options) && question.options.length > 0) {
        const optionValues = question.options.map((opt: any) => (typeof opt === "object" ? opt.value : opt));
        if (!optionValues.includes(value)) {
          return { isValid: false, error: "Please select a valid option." };
        }
      }
      break;
    }

    case "MULTIPLE_CHOICE": {
      if (!Array.isArray(value)) {
        return { isValid: false, error: "Multiple choice answers must be a list." };
      }
      if (Array.isArray(question.options) && question.options.length > 0) {
        const optionValues = question.options.map((opt: any) => (typeof opt === "object" ? opt.value : opt));
        for (const item of value) {
          if (!optionValues.includes(item)) {
            return { isValid: false, error: `Invalid option selected: ${item}` };
          }
        }
      }
      break;
    }

    case "YES_NO": {
      if (typeof value === "boolean") break;
      if (typeof value === "string") {
        const lower = value.trim().toLowerCase();
        if (lower === "yes" || lower === "no" || lower === "true" || lower === "false") {
          break;
        }
      }
      return { isValid: false, error: "Please answer Yes or No." };
    }

    case "RATING_SCALE":
    case "STAR_RATING": {
      const rating = Number(value);
      if (isNaN(rating) || rating < 1) {
        return { isValid: false, error: "Please select a rating." };
      }
      const minRating = question.validationRules?.min ?? 1;
      const maxRating = question.validationRules?.max ?? 5;
      if (rating < minRating) {
        return { isValid: false, error: `Minimum rating is ${minRating}.` };
      }
      if (rating > maxRating) {
        return { isValid: false, error: `Maximum rating is ${maxRating}.` };
      }
      break;
    }

    case "DATE": {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return { isValid: false, error: "Please enter a valid date." };
      }
      break;
    }

    case "MATRIX": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { isValid: false, error: "Please complete all matrix rows." };
      }
      const matrixRows = (question.options as any)?.matrixRows || (typeof question.options === "object" && !Array.isArray(question.options) ? (question.options as any).rows : null);
      if (Array.isArray(matrixRows) && matrixRows.length > 0) {
        for (const row of matrixRows) {
          if (!value[row] || String(value[row]).trim() === "") {
            return { isValid: false, error: `Please select an option for "${row}".` };
          }
        }
      }
      break;
    }
  }

  return { isValid: true };
}

// -----------------------------------------------------------------------------
// 6. Progress Calculation
// -----------------------------------------------------------------------------

export function calculateProgress(
  currentQuestionId: string,
  applicableQuestions: SurveyQuestion[],
  answers: Record<string, any>
): { currentStep: number; totalSteps: number; percentage: number } {
  if (applicableQuestions.length === 0) {
    return { currentStep: 0, totalSteps: 0, percentage: 100 };
  }

  const currentIndex = applicableQuestions.findIndex((q) => q.id === currentQuestionId);
  const currentStep = currentIndex === -1 ? 1 : currentIndex + 1;
  const totalSteps = applicableQuestions.length;

  // Calculate percentage based on answered questions among applicable
  const answeredCount = applicableQuestions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
  const percentage = Math.min(100, Math.round((answeredCount / totalSteps) * 100));

  return { currentStep, totalSteps, percentage };
}
