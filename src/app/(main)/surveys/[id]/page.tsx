"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  CheckCircle,
  Coins,
  Clock,
  ClipboardList,
  GitBranch,
  ShieldCheck,
  Award,
  AlertCircle,
  ArrowRight,
  Check,
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
  const [customer, setCustomer] = useState<{ fullName?: string; displayName?: string } | null>(null);

  // Auth / session required state
  const [isAuthRequired, setIsAuthRequired] = useState(false);

  // Intro Screen State (True until user taps Start or Resume)
  const [hasStarted, setHasStarted] = useState(false);
  const [isResumeAttempt, setIsResumeAttempt] = useState(false);

  // Respondent answers & validation
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "ERROR">("SAVED");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completion / Disqualification states
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [earnedCoins, setEarnedCoins] = useState(0);

  // 1. Load user profile
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.customer) {
          setCustomer(data.customer);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Load survey and attempt
  const loadSurvey = useCallback(async () => {
    setIsLoading(true);
    setGeneralError(null);
    setIsAuthRequired(false);
    try {
      const surveyRes = await fetch(`/api/surveys/${surveyId}`);
      const surveyData = await surveyRes.json();

      if (!surveyRes.ok || !surveyData.success) {
        throw new Error(surveyData.error || "Failed to load survey details.");
      }

      setSurvey(surveyData.survey);
      setQuestions(surveyData.questions || []);

      const startRes = await fetch(`/api/surveys/${surveyId}/start`, { method: "POST" });
      const startData = await startRes.json();

      if (startRes.status === 401) {
        setIsAuthRequired(true);
        setIsLoading(false);
        return;
      }

      if (!startRes.ok || !startData.success) {
        if (startData.error?.toLowerCase().includes("sign in")) {
          setIsAuthRequired(true);
        } else {
          setGeneralError(startData.error || "Unable to start survey.");
        }
        setIsLoading(false);
        return;
      }

      if (startData.isCompleted) {
        setIsCompleted(true);
        setEarnedCoins(startData.attempt?.reward_coins || 0);
        setCompletionMessage("You have already completed this survey.");
        setIsLoading(false);
        return;
      }

      setAttempt(startData.attempt);

      const existingAnswers = startData.attempt?.answers || {};
      if (Object.keys(existingAnswers).length > 0) {
        setIsResumeAttempt(true);
        setAnswers(existingAnswers);
      }
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  // 3. Compute applicable questions given current answers
  const navResult = computeApplicableQuestions(
    questions,
    answers,
    survey?.surveyType || "STATIC"
  );
  const applicableQuestions = navResult.applicableQuestions;

  // 4. Debounced Autosave
  const triggerAutosave = useCallback(
    async (newAnswers: Record<string, any>) => {
      if (!attempt?.id) return;
      setSaveStatus("SAVING");

      try {
        const res = await fetch(`/api/surveys/${surveyId}/save`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.id,
            answers: newAnswers,
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
    [attempt?.id, surveyId]
  );

  // 5. Handle answer change
  const handleAnswerChange = (questionId: string, val: any) => {
    if (fieldErrors[questionId]) {
      const updatedErrors = { ...fieldErrors };
      delete updatedErrors[questionId];
      setFieldErrors(updatedErrors);
    }

    const updatedAnswers = {
      ...answers,
      [questionId]: val,
    };

    const { cleanedAnswers } = invalidateDownstreamAnswers(
      questions,
      updatedAnswers,
      survey?.surveyType || "STATIC"
    );

    setAnswers(cleanedAnswers);
    triggerAutosave(cleanedAnswers);
  };

  // 6. Handle Final Submission
  const handleSubmit = async () => {
    if (!attempt?.id || isSubmitting) return;

    const errors: Record<string, string> = {};
    for (const q of applicableQuestions) {
      const val = answers[q.id];
      const valRes = validateAnswerValue(q, val);
      if (!valRes.isValid) {
        errors[q.id] = valRes.error || "Please answer this question.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError("Please complete all required questions to submit.");
      const firstErrorId = Object.keys(errors)[0];
      const el = document.getElementById(`q-${firstErrorId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

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
      setGeneralError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mb-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        </div>
        <p className="text-xs font-semibold text-slate-700">Loading survey...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Connecting to GharSure research engine</p>
      </div>
    );
  }

  // Error State
  if (generalError && !survey) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Survey Not Available</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{generalError}</p>
        <div className="pt-2">
          <Link
            href="/rewards"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Explore Available Surveys</span>
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // A. INTRO SCREEN (Full-Width Responsive Card)
  // ---------------------------------------------------------------------------
  if (!hasStarted && !isCompleted && !isDisqualified) {
    const isDecisionBased = survey?.surveyType === "DECISION_BASED";
    const questionCountText = isDecisionBased
      ? "Adaptive (6-9 questions)"
      : `${questions.length} questions`;

    return (
      <div className="w-full max-w-3xl mx-auto py-6 sm:py-10 space-y-6">
        {/* Back Link */}
        <Link
          href="/rewards"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Rewards</span>
        </Link>

        {/* Intro Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-b from-blue-50/40 via-white to-white space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                {survey?.category || "Research Survey"}
              </span>
              {survey?.rewardCoins ? (
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  +{survey.rewardCoins} Coins Reward
                </span>
              ) : null}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {survey?.title || "Community Research Survey"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              {survey?.description || "Help us improve household solutions and everyday care by answering a few quick questions."}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Time</div>
                  <div className="text-xs font-bold text-slate-800">~{survey?.estimatedDurationMin || 3} mins</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-[#2563EB] shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Question Count</div>
                  <div className="text-xs font-bold text-slate-800">{questionCountText}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Privacy</div>
                  <div className="text-xs font-bold text-slate-800">100% Confidential</div>
                </div>
              </div>
            </div>

            {/* In-progress notice */}
            {isResumeAttempt && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>You have an in-progress response saved. Resuming will restore your answers.</span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {isAuthRequired ? (
                <button
                  type="button"
                  onClick={() => router.push(`/auth?from=${encodeURIComponent(`/surveys/${surveyId}`)}`)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm tracking-wide transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In with Mobile to Start</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setHasStarted(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm tracking-wide transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isResumeAttempt ? "Resume Survey" : "Start Survey"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/rewards"
                className="w-full sm:w-auto px-4 py-3 text-center text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel and return
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // B. COMPLETION STATE (Celebratory Full-Width Card)
  // ---------------------------------------------------------------------------
  if (isCompleted) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 sm:py-16 text-center space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8 sm:p-10 space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Survey Completed!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              {completionMessage || "Thank you for contributing your localized insights!"}
            </p>
          </div>

          {earnedCoins > 0 && (
            <div className="py-3 px-5 rounded-xl bg-amber-50 border border-amber-200 inline-flex items-center justify-center gap-2">
              <Coins className="w-4.5 h-4.5 text-amber-600" />
              <span className="text-sm sm:text-base font-bold text-amber-900 font-mono">
                +{earnedCoins} Reward Coins Credited
              </span>
            </div>
          )}

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/store"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <span>Redeem Coins in Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/rewards"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm transition-colors"
            >
              Back to Rewards
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // C. DISQUALIFIED STATE
  // ---------------------------------------------------------------------------
  if (isDisqualified) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Survey Concluded</h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{completionMessage}</p>
          <Link
            href="/rewards"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2563EB] text-white font-semibold text-xs"
          >
            Return to Rewards
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // D. ACTIVE SURVEY QUESTIONNAIRE (Full Available Desktop Width Layout)
  // ---------------------------------------------------------------------------
  const totalQuestions = applicableQuestions.length;
  const answeredCount = applicableQuestions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== ""
  ).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="w-full space-y-6">
      {/* Top Bar with Back Link, Title, Coins, Progress */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/rewards"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Return to rewards"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                  {survey?.category || "Survey"}
                </span>
                {survey?.rewardCoins ? (
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{survey.rewardCoins} Coins
                  </span>
                ) : null}
              </div>
              <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
                {survey?.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs self-start sm:self-center">
            {saveStatus === "SAVING" ? (
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                <span>Autosaving...</span>
              </span>
            ) : saveStatus === "SAVED" ? (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Autosaved</span>
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Offline</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Question progress: {answeredCount} of {totalQuestions} answered
            </span>
            <span className="font-mono font-bold text-slate-700">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout (Desktop 12-cols, Mobile 1-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Desktop Sticky Sidebar, 4 Cols) */}
        <aside className="hidden lg:block lg:col-span-4 space-y-4 sticky top-24">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Survey Checklist
            </div>

            {/* Questions Jump / Completion Tracker */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {applicableQuestions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
                const hasError = Boolean(fieldErrors[q.id]);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`q-${q.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      hasError
                        ? "border-red-200 bg-red-50/50 text-red-700"
                        : isAnswered
                        ? "border-emerald-200 bg-emerald-50/40 text-emerald-900"
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/40 text-slate-700"
                    }`}
                  >
                    <span className="truncate pr-2 font-medium">
                      {idx + 1}. {q.questionText}
                    </span>
                    {isAnswered ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>Responses are encrypted and strictly confidential.</span>
            </div>
          </div>
        </aside>

        {/* Right Column (Questionnaire Content, 8 Cols on Desktop, Full on Mobile) */}
        <section className="lg:col-span-8 space-y-5">
          {applicableQuestions.map((q, idx) => (
            <div
              key={q.id}
              id={`q-${q.id}`}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs hover:border-slate-300 transition-colors"
            >
              {/* Question Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                    Question {idx + 1} of {totalQuestions}
                  </span>
                  {q.isRequired && (
                    <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-semibold">
                      Required
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {q.questionText}
                </h3>

                {q.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
                    {q.description}
                  </p>
                )}
              </div>

              {/* Ergonomically Aligned Question Options Container */}
              <div className="max-w-xl">
                <QuestionRenderer
                  index={idx}
                  question={q}
                  value={answers[q.id]}
                  onChange={(val) => handleAnswerChange(q.id, val)}
                  error={fieldErrors[q.id]}
                  hideHeader={true}
                />
              </div>

              {/* Error Message */}
              {fieldErrors[q.id] && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors[q.id]}</span>
                </div>
              )}
            </div>
          ))}

          {/* General Error notice */}
          {generalError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Bottom Action Card (Submit) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Ready to submit your feedback?
              </div>
              <div className="text-xs text-slate-500">
                +{survey?.rewardCoins || 0} reward coins will be credited to your account immediately.
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit & Claim +{survey?.rewardCoins || 0} Coins</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
