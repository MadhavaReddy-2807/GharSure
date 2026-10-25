import { getDirectSql, isDirectDatabaseConfigured } from "./supabase/direct-db";
import { inMemoryDb } from "./supabase/db";
import {
  SurveyQuestion,
  computeApplicableQuestions,
  invalidateDownstreamAnswers,
  validateAnswerValue,
} from "./survey-engine";
import { dummySurveyStore, DummySurvey } from "./dummy-surveys";

// -----------------------------------------------------------------------------
// In-Memory store extensions for testing & fallback
// -----------------------------------------------------------------------------
const memorySurveys = new Map<string, any>();
const memoryAttempts = new Map<string, any>();

export async function listAvailableSurveysForCustomer(customerId: string): Promise<any[]> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        SELECT 
          s.id, s.survey_id, s.title, s.description, s.category,
          s.estimated_duration_min, s.reward_coins, s.survey_type,
          s.allow_resume, s.allow_review, s.status, s.published_at,
          sr.id as attempt_id, sr.status as attempt_status, sr.reward_issued,
          sr.last_saved_at as attempt_last_saved
        FROM surveys s
        LEFT JOIN survey_responses sr ON sr.survey_id = s.id AND sr.customer_id = ${customerId}
        WHERE s.status = 'PUBLISHED'
        ORDER BY s.published_at DESC;
      `;

      if (rows && rows.length > 0) {
        return rows.map((r) => {
          let userStatus: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "DISQUALIFIED" = "AVAILABLE";
          if (r.attempt_status === "COMPLETED") {
            userStatus = "COMPLETED";
          } else if (r.attempt_status === "IN_PROGRESS" || r.attempt_status === "STARTED") {
            userStatus = "IN_PROGRESS";
          } else if (r.attempt_status === "DISQUALIFIED") {
            userStatus = "DISQUALIFIED";
          }

          return {
            id: r.id,
            surveyId: r.survey_id,
            title: r.title,
            description: r.description,
            category: r.category,
            estimatedDurationMin: r.estimated_duration_min,
            rewardCoins: r.reward_coins,
            surveyType: r.survey_type || "STATIC",
            allowResume: r.allow_resume !== false,
            userStatus,
            attemptId: r.attempt_id || null,
            rewardIssued: r.reward_issued || false,
          };
        });
      }
    } catch (err) {
      console.warn("[SurveyDB] DB error listing available surveys, falling back to dummy surveys:", (err as Error).message);
    }
  }

  // Fallback to Dummy Surveys Store + memorySurveys
  const allSurveys: any[] = [];
  const seenIds = new Set<string>();

  // Custom in-memory surveys from unit tests
  for (const s of memorySurveys.values()) {
    if (!seenIds.has(s.id) && s.status === "PUBLISHED") {
      seenIds.add(s.id);
      allSurveys.push(s);
    }
  }

  // Pre-seeded rich dummy surveys
  for (const s of dummySurveyStore.listPublishedSurveys()) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      allSurveys.push(s);
    }
  }

  return allSurveys.map((s) => {
    // Check attempt in memoryAttempts or dummySurveyStore
    const attempt =
      Array.from(memoryAttempts.values()).find(
        (a) => (a.survey_id === s.id || a.survey_id === s.survey_id) && a.customer_id === customerId
      ) || dummySurveyStore.findAttempt(s.id, customerId);

    let userStatus: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "DISQUALIFIED" = "AVAILABLE";
    if (attempt?.status === "COMPLETED") userStatus = "COMPLETED";
    else if (attempt?.status === "IN_PROGRESS" || attempt?.status === "STARTED") userStatus = "IN_PROGRESS";
    else if (attempt?.status === "DISQUALIFIED") userStatus = "DISQUALIFIED";

    return {
      id: s.id,
      surveyId: s.survey_id || s.surveyId || s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      estimatedDurationMin: s.estimated_duration_min ?? s.estimatedDurationMin ?? 3,
      rewardCoins: s.reward_coins ?? s.rewardCoins ?? 50,
      surveyType: s.survey_type || s.surveyType || "STATIC",
      allowResume: s.allow_resume !== false,
      userStatus,
      attemptId: attempt?.id || null,
      rewardIssued: attempt?.reward_issued || false,
    };
  });
}

export async function getSurveyForTaking(surveyId: string, customerId: string): Promise<any | null> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const [survey] = await sql`
        SELECT * FROM surveys 
        WHERE id::text = ${surveyId} OR survey_id = ${surveyId} OR LOWER(survey_id) = LOWER(${surveyId})
        LIMIT 1;
      `;
      if (survey) {
        // Get latest published version snapshot if available
        const [versionRow] = await sql`
          SELECT * FROM survey_versions
          WHERE survey_id = ${survey.id}
          ORDER BY version_num DESC
          LIMIT 1;
        `;

        let rawQuestions: any[] = [];
        if (versionRow && versionRow.snapshot?.questions && Array.isArray(versionRow.snapshot.questions) && versionRow.snapshot.questions.length > 0) {
          rawQuestions = versionRow.snapshot.questions;
        } else {
          rawQuestions = await sql`
            SELECT id, order_num, question_text, question_type, description,
                   options, is_required, validation_rules, branching_rules, section_name
            FROM survey_questions
            WHERE survey_id = ${survey.id}
            ORDER BY order_num ASC;
          `;
        }

        const questions = (rawQuestions || []).map((q: any, idx: number) => ({
          id: q.id,
          orderNum: q.order_num ?? q.orderNum ?? idx + 1,
          questionText: q.question_text ?? q.questionText ?? "",
          questionType: q.question_type ?? q.questionType ?? "SINGLE_CHOICE",
          description: q.description || null,
          options: q.options || [],
          isRequired: q.is_required !== undefined ? q.is_required : q.isRequired !== false,
          validationRules: q.validation_rules || q.validationRules || {},
          branchingRules: Array.isArray(q.branching_rules)
            ? q.branching_rules
            : Array.isArray(q.branchingRules)
            ? q.branchingRules
            : [],
          sectionName: q.section_name || q.sectionName || null,
        }));

        // Check existing attempt for customer
        let attempt = null;
        if (customerId) {
          const attempts = await sql`
            SELECT * FROM survey_responses
            WHERE survey_id = ${survey.id} AND (customer_id::text = ${customerId} OR customer_id IN (SELECT id FROM customers WHERE customer_id = ${customerId}))
            LIMIT 1;
          `;
          attempt = attempts[0] || null;
        }

        return {
          survey: {
            id: survey.id,
            surveyId: survey.survey_id,
            title: survey.title,
            description: survey.description,
            category: survey.category,
            estimatedDurationMin: survey.estimated_duration_min,
            rewardCoins: versionRow ? versionRow.reward_coins : survey.reward_coins,
            surveyType: survey.survey_type || "STATIC",
            allowResume: survey.allow_resume !== false,
            allowReview: survey.allow_review === true,
            status: survey.status,
            versionSnapshotId: versionRow?.id || null,
          },
          questions,
          attempt: attempt || null,
        };
      }
    } catch (err) {
      console.warn("[SurveyDB] DB error getting survey for taking, falling back:", (err as Error).message);
    }
  }

  // In-memory fallback
  const s =
    memorySurveys.get(surveyId) ||
    Array.from(memorySurveys.values()).find((x) => x.id === surveyId || x.survey_id === surveyId) ||
    dummySurveyStore.getSurvey(surveyId);

  if (!s) return null;

  const attempt =
    Array.from(memoryAttempts.values()).find(
      (a) => (a.survey_id === s.id || a.survey_id === s.survey_id) && a.customer_id === customerId
    ) || dummySurveyStore.findAttempt(s.id, customerId);

  return {
    survey: {
      id: s.id,
      surveyId: s.survey_id || s.surveyId || s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      estimatedDurationMin: s.estimated_duration_min ?? s.estimatedDurationMin ?? 3,
      rewardCoins: s.reward_coins ?? s.rewardCoins ?? 50,
      surveyType: s.survey_type || s.surveyType || "STATIC",
      allowResume: s.allow_resume !== false,
      allowReview: s.allow_review === true,
      status: s.status,
      versionSnapshotId: null,
    },
    questions: s.questions || [],
    attempt: attempt || null,
  };
}

export async function startOrResumeSurveyAttempt(
  surveyId: string,
  customerId: string
): Promise<{ attempt: any; isResume: boolean; isCompleted: boolean; error?: string }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const [survey] = await sql`
        SELECT id, status, reward_coins, allow_resume 
        FROM surveys 
        WHERE id::text = ${surveyId} OR survey_id = ${surveyId} OR LOWER(survey_id) = LOWER(${surveyId})
        LIMIT 1;
      `;
      if (survey) {
        if (survey.status !== "PUBLISHED") {
          return { attempt: null, isResume: false, isCompleted: false, error: "Survey is not open for responses." };
        }

        // Verify customer exists in database to avoid foreign key violation
        const customers = await sql`
          SELECT id FROM customers 
          WHERE id::text = ${customerId} OR customer_id = ${customerId}
          LIMIT 1;
        `;

        if (!customers || customers.length === 0) {
          return {
            attempt: null,
            isResume: false,
            isCompleted: false,
            error: "Please sign in to take this survey.",
          };
        }

        const resolvedCustomerUuid = customers[0].id;

        // Check existing attempt
        const [existing] = await sql`
          SELECT * FROM survey_responses
          WHERE survey_id = ${survey.id} AND customer_id = ${resolvedCustomerUuid}
          LIMIT 1;
        `;

        if (existing) {
          if (existing.status === "COMPLETED") {
            return { attempt: existing, isResume: false, isCompleted: true };
          }
          if (existing.status === "IN_PROGRESS" || existing.status === "STARTED") {
            // Resume!
            await sql`
              UPDATE survey_responses
              SET last_saved_at = NOW()
              WHERE id = ${existing.id};
            `;
            return { attempt: existing, isResume: true, isCompleted: false };
          }
        }

        // Create new attempt
        const [newAttempt] = await sql`
          INSERT INTO survey_responses (
            survey_id, customer_id, status, answers, question_path,
            started_at, last_saved_at, reward_coins
          )
          VALUES (
            ${survey.id}, ${resolvedCustomerUuid}, 'IN_PROGRESS', '{}'::jsonb, '[]'::jsonb,
            NOW(), NOW(), ${survey.reward_coins}
          )
          ON CONFLICT (survey_id, customer_id) DO UPDATE
          SET status = CASE WHEN survey_responses.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
              last_saved_at = NOW()
          RETURNING *;
        `;

        return {
          attempt: newAttempt,
          isResume: false,
          isCompleted: newAttempt.status === "COMPLETED",
        };
      }
    } catch (err) {
      console.warn("[SurveyDB] Start attempt direct DB error, falling back to dummy store:", (err as Error).message);
    }
  }

  // In-memory fallback
  const s =
    memorySurveys.get(surveyId) ||
    Array.from(memorySurveys.values()).find((x) => x.id === surveyId || x.survey_id === surveyId) ||
    dummySurveyStore.getSurvey(surveyId);

  if (!s) {
    return { attempt: null, isResume: false, isCompleted: false, error: "Survey not found." };
  }

  // Check test memoryAttempts
  let attempt = Array.from(memoryAttempts.values()).find(
    (a) => (a.survey_id === s.id || a.survey_id === s.survey_id) && a.customer_id === customerId
  );

  if (attempt) {
    return {
      attempt,
      isResume: attempt.status === "IN_PROGRESS" || attempt.status === "STARTED",
      isCompleted: attempt.status === "COMPLETED",
    };
  }

  // Use dummySurveyStore
  const dummyRes = dummySurveyStore.startOrResumeAttempt(s.id, customerId);
  if (dummyRes.attempt) {
    memoryAttempts.set(dummyRes.attempt.id, dummyRes.attempt);
  }
  return dummyRes;
}

export async function saveSurveyAutosave(
  attemptId: string,
  customerId: string,
  answers: Record<string, any>,
  currentQuestionId?: string,
  questionPath?: string[]
): Promise<{ success: boolean; attempt?: any; error?: string }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const rows = await sql`
        UPDATE survey_responses
        SET 
          answers = ${JSON.stringify(answers)}::jsonb,
          current_question_id = ${currentQuestionId || null},
          question_path = ${JSON.stringify(questionPath || [])}::jsonb,
          last_saved_at = NOW()
        WHERE id::text = ${attemptId} AND (customer_id::text = ${customerId} OR customer_id IN (SELECT id FROM customers WHERE customer_id = ${customerId})) AND status IN ('STARTED', 'IN_PROGRESS')
        RETURNING *;
      `;

      if (rows && rows.length > 0) {
        return { success: true, attempt: rows[0] };
      }
    } catch (err) {
      console.warn("[SurveyDB] Autosave direct DB error, falling back:", (err as Error).message);
    }
  }

  // In-memory fallback
  const attempt = memoryAttempts.get(attemptId);
  if (attempt && attempt.customer_id === customerId) {
    attempt.answers = { ...attempt.answers, ...answers };
    attempt.current_question_id = currentQuestionId || attempt.current_question_id;
    attempt.question_path = questionPath || attempt.question_path;
    attempt.last_saved_at = new Date().toISOString();
    return { success: true, attempt };
  }

  // Try dummySurveyStore
  return dummySurveyStore.saveAttemptAutosave(attemptId, customerId, answers, currentQuestionId, questionPath);
}

export async function submitSurveyCompletion(
  attemptId: string,
  customerId: string,
  finalAnswers: Record<string, any>
): Promise<{ success: boolean; coinsAwarded: number; status: string; message?: string; error?: string }> {
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();

      return await sql.begin(async (tx) => {
        // 1. Lock and load attempt
        const [attempt] = await tx`
          SELECT sr.*, s.title as survey_title, s.survey_type, s.reward_coins as configured_reward
          FROM survey_responses sr
          JOIN surveys s ON sr.survey_id = s.id
          WHERE sr.id::text = ${attemptId} AND (sr.customer_id::text = ${customerId} OR sr.customer_id IN (SELECT id FROM customers WHERE customer_id = ${customerId}))
          FOR UPDATE;
        `;

        if (!attempt) throw new Error("Survey attempt not found in database.");

        if (attempt.status === "COMPLETED") {
          return {
            success: true,
            coinsAwarded: attempt.reward_coins,
            status: "COMPLETED",
            message: "Survey already completed.",
          };
        }

        // 2. Fetch survey questions to validate answers and branching completion
        const rawQuestions = await tx`
          SELECT id, order_num, question_text, question_type, options, is_required, validation_rules, branching_rules
          FROM survey_questions
          WHERE survey_id = ${attempt.survey_id}
          ORDER BY order_num ASC;
        `;

        const mappedQuestions: SurveyQuestion[] = (rawQuestions as any[]).map((q) => ({
          id: q.id,
          orderNum: q.order_num ?? q.orderNum,
          questionText: q.question_text ?? q.questionText,
          questionType: q.question_type ?? q.questionType,
          description: q.description,
          options: q.options,
          isRequired: q.is_required ?? q.isRequired,
          validationRules: q.validation_rules ?? q.validationRules,
          branchingRules: q.branching_rules ?? q.branchingRules,
          sectionName: q.section_name ?? q.sectionName,
        }));

        // Normalize answers to map by question ID, or by index/orderNum if question IDs were updated
        const normalizedAnswers: Record<string, any> = { ...finalAnswers };
        const answerEntries = Object.entries(finalAnswers);

        mappedQuestions.forEach((q, idx) => {
          if (normalizedAnswers[q.id] === undefined) {
            if (finalAnswers[`q_${q.orderNum}`] !== undefined) {
              normalizedAnswers[q.id] = finalAnswers[`q_${q.orderNum}`];
            } else if (finalAnswers[String(q.orderNum)] !== undefined) {
              normalizedAnswers[q.id] = finalAnswers[String(q.orderNum)];
            } else if (answerEntries[idx] !== undefined) {
              normalizedAnswers[q.id] = answerEntries[idx][1];
            }
          }
        });

        // Clean downstream answers according to branching rules
        const { cleanedAnswers } = invalidateDownstreamAnswers(
          mappedQuestions,
          normalizedAnswers,
          attempt.survey_type || "STATIC"
        );

        // Compute applicable questions
        const navEval = computeApplicableQuestions(
          mappedQuestions,
          cleanedAnswers,
          attempt.survey_type || "STATIC"
        );

        // Check if early disqualification rule triggered
        if (navEval.isTerminated && navEval.terminationOutcome === "DISQUALIFIED") {
          await tx`
            UPDATE survey_responses
            SET status = 'DISQUALIFIED',
                answers = ${JSON.stringify(cleanedAnswers)}::jsonb,
                disqualification_reason = ${navEval.terminationReason || "Disqualified"},
                completed_at = NOW()
            WHERE id::text = ${attemptId};
          `;
          return {
            success: true,
            coinsAwarded: 0,
            status: "DISQUALIFIED",
            message: navEval.terminationReason || "Thank you. You do not meet the criteria for this survey.",
          };
        }

        // Validate all required applicable questions are answered
        for (const q of navEval.applicableQuestions) {
          const valRes = validateAnswerValue(q, cleanedAnswers[q.id]);
          if (!valRes.isValid) {
            throw new Error(`Question "${q.questionText}": ${valRes.error}`);
          }
        }

        // 3. Mark completed and issue coins atomically
        const coinsToAward = Number(attempt.configured_reward || 0);
        const idempotencyKey = `survey_reward_${attempt.id}`;
        const targetCustomerId = attempt.customer_id;

        // Insert coin transaction if reward > 0
        if (coinsToAward > 0) {
          await tx`
            INSERT INTO coin_transactions (
              customer_id, amount, type, description, idempotency_key, metadata
            )
            VALUES (
              ${targetCustomerId},
              ${coinsToAward},
              'SURVEY_REWARD',
              ${`Survey completion reward: ${attempt.survey_title}`},
              ${idempotencyKey},
              ${JSON.stringify({ surveyId: attempt.survey_id, attemptId: attempt.id })}::jsonb
            )
            ON CONFLICT (idempotency_key) DO NOTHING;
          `;

          // Increment customer reward_coins
          await tx`
            UPDATE customers
            SET reward_coins = COALESCE(reward_coins, 0) + ${coinsToAward}, updated_at = NOW()
            WHERE id = ${targetCustomerId};
          `;
        }

        // 4. Mark attempt COMPLETED
        await tx`
          UPDATE survey_responses
          SET status = 'COMPLETED',
              answers = ${JSON.stringify(cleanedAnswers)}::jsonb,
              reward_coins = ${coinsToAward},
              reward_issued = ${coinsToAward > 0},
              idempotency_key = ${idempotencyKey},
              completed_at = NOW()
          WHERE id::text = ${attemptId};
        `;

        // 5. Increment surveys responses_count
        await tx`
          UPDATE surveys
          SET responses_count = responses_count + 1, updated_at = NOW()
          WHERE id = ${attempt.survey_id};
        `;

        return {
          success: true,
          coinsAwarded: coinsToAward,
          status: "COMPLETED",
          message: `Survey completed! +${coinsToAward} coins added to your wallet.`,
        };
      });
    } catch (err: any) {
      console.warn("[SurveyDB] Submit direct DB error:", err.message);
      return {
        success: false,
        coinsAwarded: 0,
        status: "ERROR",
        error: err.message || "Failed to submit survey answers.",
      };
    }
  }

  // In-memory fallback
  const attempt = memoryAttempts.get(attemptId);
  if (attempt) {
    const s =
      memorySurveys.get(attempt.survey_id) ||
      Array.from(memorySurveys.values()).find((x) => x.id === attempt.survey_id || x.survey_id === attempt.survey_id) ||
      dummySurveyStore.getSurvey(attempt.survey_id);

    const coins = s?.reward_coins ?? s?.rewardCoins ?? 50;

    attempt.status = "COMPLETED";
    attempt.answers = { ...finalAnswers };
    attempt.reward_coins = coins;
    attempt.reward_issued = true;
    attempt.completed_at = new Date().toISOString();

    inMemoryDb.addCustomerCoins(customerId, coins);

    return {
      success: true,
      coinsAwarded: coins,
      status: "COMPLETED",
      message: `Survey completed! +${coins} coins added.`,
    };
  }

  // Try dummySurveyStore
  const dummyRes = dummySurveyStore.submitAttempt(attemptId, customerId, finalAnswers);
  if (dummyRes.success && dummyRes.coinsAwarded > 0) {
    inMemoryDb.addCustomerCoins(customerId, dummyRes.coinsAwarded);
  }
  return dummyRes;
}

// Memory store helpers for unit tests
export function _setMemorySurvey(survey: any) {
  memorySurveys.set(survey.id, survey);
  if (survey.survey_id) memorySurveys.set(survey.survey_id, survey);
  if (survey.surveyId) memorySurveys.set(survey.surveyId, survey);
}

export function _resetMemorySurveys() {
  memorySurveys.clear();
  memoryAttempts.clear();
  dummySurveyStore.seed();
}
