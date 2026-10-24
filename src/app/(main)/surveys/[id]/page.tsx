"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  Clock,
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import {
  SurveyQuestion,
  computeApplicableQuestions,
  invalidateDownstreamAnswers,
  validateAnswerValue,
  calculateProgress,
} from "@/lib/survey-engine";

export default function SurveyTakingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: surveyId } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [attempt, setAttempt] = useState<any>(null);

  // Respondent answers & navigation state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionPath, setQuestionPath] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "ERROR">("SAVED");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completion / Disqualification states
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // 1. Load survey and attempt
  const loadSurvey = useCallback(async () => {
    setIsLoading(true);
    try {
      // First start or resume attempt
      const startRes = await fetch(`/api/surveys/${surveyId}/start`, { method: "POST" });
      const startData = await startRes.json();

      if (!startRes.ok || !startData.success) {
        throw new Error(startData.error || "Unable to start survey.");
      }

      if (startData.isCompleted) {
        setIsCompleted(true);
        setEarnedCoins(startData.attempt?.reward_coins || 0);
        setCompletionMessage("You have already completed this survey.");
        setIsLoading(false);
        return;
      }

      setAttempt(startData.attempt);

      // Load survey definition & questions
      const surveyRes = await fetch(`/api/surveys/${surveyId}`);
      const surveyData = await surveyRes.json();

      if (!surveyRes.ok || !surveyData.success) {
        throw new Error(surveyData.error || "Failed to load survey details.");
      }

      setSurvey(surveyData.survey);
      setQuestions(surveyData.questions || []);

      // Pre-fill answers from saved attempt
      if (startData.attempt?.answers) {
        setAnswers(startData.attempt.answers);
      }

      // Reconstruct question index
      if (startData.attempt?.current_question_id && surveyData.questions) {
        const foundIdx = surveyData.questions.findIndex(
          (q: any) => q.id === startData.attempt.current_question_id
        );
        if (foundIdx !== -1) {
          setCurrentQuestionIndex(foundIdx);
        }
      }
    } catch (err: any) {
      setFieldError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  // 2. Compute applicable questions given current answers
  const navResult = computeApplicableQuestions(
    questions,
    answers,
    survey?.surveyType || "STATIC"
  );
  const applicableQuestions = navResult.applicableQuestions;
  const currentQuestion = applicableQuestions[currentQuestionIndex] || applicableQuestions[0];

  // 3. Debounced Autosave
  const triggerAutosave = useCallback(
    async (newAnswers: Record<string, any>, currentQId?: string) => {
      if (!attempt?.id) return;
      setSaveStatus("SAVING");

      try {
        const res = await fetch(`/api/surveys/${surveyId}/save`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.id,
            answers: newAnswers,
            currentQuestionId: currentQId,
            questionPath,
          }),
        });

        if (res.ok) {
          setSaveStatus("SAVED");
        } else {
          setSaveStatus("ERROR");
        }
      } catch {
        setSaveStatus("ERROR");
      }
    },
    [attempt?.id, surveyId, questionPath]
  );

  // 4. Handle answer change with automatic downstream invalidation
  const handleAnswerChange = (val: any) => {
    if (!currentQuestion) return;
    setFieldError(null);

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: val,
    };

    // Clean downstream answers if branching changes
    const { cleanedAnswers } = invalidateDownstreamAnswers(
      questions,
      updatedAnswers,
      survey?.surveyType || "STATIC"
    );

    setAnswers(cleanedAnswers);
    triggerAutosave(cleanedAnswers, currentQuestion.id);
  };

  // 5. Handle Next Question
  const handleNext = () => {
    if (!currentQuestion) return;

    // Validate current question answer
    const valRes = validateAnswerValue(currentQuestion, answers[currentQuestion.id]);
    if (!valRes.isValid) {
      setFieldError(valRes.error || "Please answer this question.");
      return;
    }

    setFieldError(null);

    // Track path
    if (!questionPath.includes(currentQuestion.id)) {
      setQuestionPath([...questionPath, currentQuestion.id]);
    }

    // Check if next index exists in applicable questions
    if (currentQuestionIndex + 1 < applicableQuestions.length) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      triggerAutosave(answers, applicableQuestions[nextIdx].id);
    } else {
      // Reached the end of applicable questions
      if (survey?.allowReview) {
        setIsReviewMode(true);
      } else {
        handleSubmit();
      }
    }
  };

  // 6. Handle Back Navigation
  const handleBack = () => {
    setFieldError(null);
    if (isReviewMode) {
      setIsReviewMode(false);
      return;
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // 7. Submit final responses and claim reward
  const handleSubmit = async () => {
    if (!attempt?.id || isSubmitting) return;
    setIsSubmitting(true);
    setFieldError(null);

    try {
      const res = await fetch(`/api/surveys/${surveyId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit survey.");
      }

      if (data.status === "DISQUALIFIED") {
        setIsDisqualified(true);
        setCompletionMessage(data.message || "Thank you. You do not meet the criteria for this survey.");
      } else {
        setIsCompleted(true);
        setEarnedCoins(data.coinsAwarded || 0);
        setCompletionMessage(data.message || `+${data.coinsAwarded || 0} coins credited to your wallet!`);
      }
    } catch (err: any) {
      setFieldError(err.message);
      setIsReviewMode(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-orange mb-3" />
        <p className="text-xs text-slate-500">Preparing survey questions...</p>
      </div>
    );
  }

  // Completion State
  if (isCompleted) {
    return (
      <div className="max-w-md mx-auto my-auto py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-brand-navy tracking-tight">Survey Completed!</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{completionMessage}</p>

        {earnedCoins > 0 && (
          <div className="my-6 p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-brand-orange" />
            <span className="text-base font-bold text-brand-navy font-mono">
              +{earnedCoins} Reward Coins Earned
            </span>
          </div>
        )}

        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={() => router.push("/rewards")}
            className="w-full h-11 rounded-xl bg-brand-orange hover:bg-brand-orange-600 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Redeem Trial Kits in Rewards
          </button>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Disqualification State
  if (isDisqualified) {
    return (
      <div className="max-w-md mx-auto my-auto py-12 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-brand-navy">Survey Concluded</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{completionMessage}</p>
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-6 w-full h-11 rounded-xl bg-slate-900 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Review Answers Mode
  if (isReviewMode) {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <h2 className="text-lg font-bold text-brand-navy">Review Your Answers</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please confirm your responses before submitting to claim your reward coins.
          </p>

          <div className="divide-y divide-slate-100 mt-5">
            {applicableQuestions.map((q, idx) => (
              <div key={q.id} className="py-3.5 text-xs">
                <span className="font-semibold text-slate-800">
                  {idx + 1}. {q.questionText}
                </span>
                <p className="text-slate-600 mt-1 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {answers[q.id] ? (
                    typeof answers[q.id] === "object" ? (
                      JSON.stringify(answers[q.id])
                    ) : (
                      String(answers[q.id])
                    )
                  ) : (
                    <span className="italic text-slate-400">Not answered</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Questions
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-600 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit & Claim Coins</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = calculateProgress(
    currentQuestion?.id || "",
    applicableQuestions,
    answers
  );

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-6 space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/rewards")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            title="Exit survey"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-brand-navy truncate max-w-[200px] sm:max-w-xs">
              {survey?.title}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">
              Question {progress.currentStep} of {progress.totalSteps}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave Status Indicator */}
          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            {saveStatus === "SAVING" ? (
              <>
                <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" />
                <span>Saving...</span>
              </>
            ) : saveStatus === "SAVED" ? (
              <span className="text-emerald-600">Saved</span>
            ) : (
              <span className="text-amber-600">Offline</span>
            )}
          </span>

          {/* Coin Reward Pill */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
            <Coins className="w-3 h-3" />
            <span>+{survey?.rewardCoins || 0}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-orange transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        {currentQuestion ? (
          <QuestionRenderer
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={handleAnswerChange}
            error={fieldError || undefined}
          />
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">No question available.</div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-100">
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={handleBack}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-600 active:bg-brand-orange-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span>
              {currentQuestionIndex + 1 < applicableQuestions.length
                ? "Next"
                : survey?.allowReview
                ? "Review Answers"
                : "Complete & Submit"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
