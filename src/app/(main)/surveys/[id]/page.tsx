"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ShieldCheck,
  GitBranch,
  ClipboardList,
  Flame,
  Award,
  ChevronRight,
  Home,
  Droplets,
  Wrench,
  Zap,
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

  // Intro Screen State (True until user taps Start or Resume)
  const [hasStarted, setHasStarted] = useState(false);
  const [isResumeAttempt, setIsResumeAttempt] = useState(false);

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

      // Check if resuming an existing attempt with answers
      const existingAnswers = startData.attempt?.answers || {};
      const answerKeys = Object.keys(existingAnswers);
      if (answerKeys.length > 0) {
        setIsResumeAttempt(true);
        setAnswers(existingAnswers);
      }

      // Load survey definition & questions
      const surveyRes = await fetch(`/api/surveys/${surveyId}`);
      const surveyData = await surveyRes.json();

      if (!surveyRes.ok || !surveyData.success) {
        throw new Error(surveyData.error || "Failed to load survey details.");
      }

      setSurvey(surveyData.survey);
      setQuestions(surveyData.questions || []);

      // Restore position if resuming
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
      setFieldError(valRes.error || "Please select or enter an answer to continue.");
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

  // Keyboard shortcut listener (Enter key to advance)
  useEffect(() => {
    if (!hasStarted || isReviewMode || isCompleted || isDisqualified) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // If typing in a textarea, allow normal newlines
        const target = e.target as HTMLElement;
        if (target?.tagName === "TEXTAREA") return;

        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Category Icon helper
  const renderCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "water quality":
        return <Droplets className="w-6 h-6 text-brand-purple" />;
      case "appliance health":
        return <Wrench className="w-6 h-6 text-brand-purple" />;
      default:
        return <ClipboardList className="w-6 h-6 text-brand-purple" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple mb-3" />
        <p className="text-xs font-semibold text-slate-600">Preparing survey questions...</p>
        <p className="text-[11px] text-slate-400 mt-1">Connecting to authoritative research server</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // A. SURVEY INTRODUCTION SCREEN (Before Questions)
  // ---------------------------------------------------------------------------
  if (!hasStarted && !isCompleted && !isDisqualified) {
    const isDecisionBased = survey?.surveyType === "DECISION_BASED";
    const questionCountText = isDecisionBased
      ? "Adaptive (6-9 questions)"
      : `${questions.length} questions`;

    return (
      <div className="w-full max-w-xl mx-auto py-6 sm:py-10 space-y-5 animate-in fade-in duration-200">
        {/* Intro Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          {/* Top category chip & reward pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-2xl bg-purple-50 text-brand-purple flex items-center justify-center border border-purple-100/80 shadow-2xs">
                {renderCategoryIcon(survey?.category)}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple block">
                  {survey?.category || "Research Survey"}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {survey?.survey_id}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-full shadow-2xs">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>+{survey?.rewardCoins || 0} Coins</span>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {survey?.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 leading-relaxed">
              {survey?.description || "Help GharSure gather community diagnostics to improve localized residential care and unlock verified trial kits."}
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center border border-slate-200/80 shadow-2xs shrink-0">
                <Clock className="w-4 h-4 text-brand-purple" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Duration</span>
                <span className="text-xs font-bold text-slate-800">~{survey?.estimatedDurationMin || 4} mins</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center border border-slate-200/80 shadow-2xs shrink-0">
                <ClipboardList className="w-4 h-4 text-brand-purple" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Questions</span>
                <span className="text-xs font-bold text-slate-800">{questionCountText}</span>
              </div>
            </div>
          </div>

          {/* Decision-Based Explanatory Notice */}
          {isDecisionBased && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <GitBranch className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold">Dynamic Smart Branching:</strong> Subsequent questions adapt dynamically based on your previous answers. Questions you don&apos;t need to answer will be skipped automatically.
              </div>
            </div>
          )}

          {/* Resident Privacy & Data Protection Notice */}
          <div className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold text-slate-800">100% Confidential & Secure:</strong> Responses are aggregated for community home health benchmarks. Your personal data is never shared with third parties.
            </div>
          </div>

          {/* In-progress resume notice */}
          {isResumeAttempt && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You have an in-progress response saved. Resuming will restore your answers.</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setHasStarted(true)}
              className="w-full h-12 rounded-2xl bg-brand-purple hover:bg-brand-purple/90 active:bg-brand-purple-600 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isResumeAttempt ? "Resume Survey" : "Start Survey"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/rewards"
              className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel and Return to Rewards
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // B. COMPLETION STATE (Celebratory Card)
  // ---------------------------------------------------------------------------
  if (isCompleted) {
    return (
      <div className="max-w-md mx-auto my-auto py-12 px-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-100 shadow-sm">
          <Award className="w-10 h-10 text-emerald-600 stroke-[2]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Survey Completed!</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">{completionMessage}</p>

        {earnedCoins > 0 && (
          <div className="my-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-center gap-2.5 shadow-2xs">
            <Coins className="w-5 h-5 text-amber-600" />
            <span className="text-lg font-bold text-amber-800 font-mono">
              +{earnedCoins} Reward Coins Added
            </span>
          </div>
        )}

        <div className="space-y-2.5 mt-8">
          <Link
            href="/rewards"
            className="w-full h-12 rounded-2xl bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Return to Rewards & Trials</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/store"
            className="w-full h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center transition-colors"
          >
            Explore Genuine Spares
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // C. DISQUALIFICATION / EARLY CONCLUDE STATE
  // ---------------------------------------------------------------------------
  if (isDisqualified) {
    return (
      <div className="max-w-md mx-auto my-auto py-12 px-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Survey Concluded</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{completionMessage}</p>
        <button
          type="button"
          onClick={() => router.push("/rewards")}
          className="mt-6 w-full h-11 rounded-2xl bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
        >
          Return to Rewards
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // D. REVIEW ANSWERS MODE (Before final submit)
  // ---------------------------------------------------------------------------
  if (isReviewMode) {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Review Your Responses</h2>
            <p className="text-xs text-slate-500 mt-1">
              Confirm your answers below before submitting to claim your {survey?.rewardCoins || 0} reward coins.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {applicableQuestions.map((q, idx) => (
              <div key={q.id} className="py-3.5 text-xs flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 block">
                    {idx + 1}. {q.questionText}
                  </span>
                  <div className="text-slate-600 mt-1 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {answers[q.id] ? (
                      typeof answers[q.id] === "object" ? (
                        Array.isArray(answers[q.id]) ? (
                          answers[q.id].join(", ")
                        ) : (
                          Object.entries(answers[q.id]).map(([k, v]) => `${k}: ${v}`).join(" · ")
                        )
                      ) : (
                        String(answers[q.id])
                      )
                    ) : (
                      <span className="italic text-slate-400">Not answered</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    setIsReviewMode(false);
                  }}
                  className="text-xs font-semibold text-brand-purple hover:text-brand-purple/80 px-2 py-1 shrink-0"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Questions
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
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

  // ---------------------------------------------------------------------------
  // E. ACTIVE QUESTION TAKING SCREEN
  // ---------------------------------------------------------------------------
  const progress = calculateProgress(
    currentQuestion?.id || "",
    applicableQuestions,
    answers
  );

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-6 space-y-4 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/rewards")}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Safe exit to rewards (Progress is autosaved)"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[180px] sm:max-w-xs leading-none">
              {survey?.title}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">
              Question {progress.currentStep} of {progress.totalSteps}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Autosave Status Indicator */}
          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            {saveStatus === "SAVING" ? (
              <>
                <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" />
                <span>Saving</span>
              </>
            ) : saveStatus === "SAVED" ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Saved
              </span>
            ) : (
              <span className="text-amber-600">Offline</span>
            )}
          </span>

          {/* Coin Reward Pill */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
            <Coins className="w-3 h-3 text-amber-600" />
            <span>+{survey?.rewardCoins || 0}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar (Purple Accent) */}
      <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-purple transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Main Question Card (Generous Whitespace, Clean White Surface) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        {currentQuestion ? (
          <QuestionRenderer
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={handleAnswerChange}
            error={fieldError || undefined}
          />
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">No questions available.</div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-100">
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={handleBack}
            className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-slate-400 font-medium mr-1">
              Press Enter ↵
            </span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 active:bg-brand-purple-600 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>
                {currentQuestionIndex + 1 < applicableQuestions.length
                  ? "Next"
                  : survey?.allowReview
                  ? "Review Answers"
                  : "Submit Survey"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
