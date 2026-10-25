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

  // 1. Load user profile for avatar
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
      // Step A: Load survey definition & questions (accessible even to guests)
      const surveyRes = await fetch(`/api/surveys/${surveyId}`);
      const surveyData = await surveyRes.json();

      if (!surveyRes.ok || !surveyData.success) {
        throw new Error(surveyData.error || "Failed to load survey details.");
      }

      setSurvey(surveyData.survey);
      setQuestions(surveyData.questions || []);

      // Step B: Start or resume survey attempt
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

      // Check if resuming an existing attempt with answers
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

  // 3. Compute applicable questions given current answers (Decision branching support)
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

  // 5. Handle answer change with dynamic branching recalculation
  const handleAnswerChange = (questionId: string, val: any) => {
    // Clear inline error for this field
    if (fieldErrors[questionId]) {
      const updatedErrors = { ...fieldErrors };
      delete updatedErrors[questionId];
      setFieldErrors(updatedErrors);
    }

    const updatedAnswers = {
      ...answers,
      [questionId]: val,
    };

    // Clean downstream answers if branching changes
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

    // Validate all applicable required questions
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
      // Scroll to the first error smoothly
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

  // Helper to split title for clean blue accent (e.g., "User Experience Survey" -> "User Experience" & "Survey")
  const renderStyledTitle = (title: string) => {
    if (!title) return null;
    const trimmed = title.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return (
        <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-800 tracking-tight leading-[1.15]">
          <span className="text-blue-600">{parts[0]}</span>
        </h1>
      );
    }

    // If last word is "Survey" or similar, accent the last word in bright blue
    const mainText = parts.slice(0, -1).join(" ");
    const accentText = parts[parts.length - 1];

    return (
      <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-800 tracking-tight leading-[1.15]">
        {mainText} <span className="text-blue-600 block sm:inline">{accentText}</span>
      </h1>
    );
  };

  // User initials for circular avatar
  const userName = customer?.displayName || customer?.fullName || "User";
  const userInitials = userName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EDF4FE] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
        <p className="text-xs font-semibold text-slate-700">Loading survey...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Connecting to GharSure research engine</p>
      </div>
    );
  }

  // Survey Not Found / Error State
  if (generalError && !survey) {
    return (
      <div className="min-h-screen bg-[#EDF4FE] relative flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-[420px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(37,99,235,0.07)] border border-white/80 p-7 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Survey Not Available</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{generalError}</p>
          <div className="pt-2">
            <Link
              href="/rewards"
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <span>Explore Available Surveys</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
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
      <div className="min-h-screen bg-[#EDF4FE] relative flex flex-col items-center justify-start p-0 sm:p-6 md:p-8 overflow-x-hidden font-sans">
        {/* Soft geometric background accents */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200/30 rounded-[64px] rotate-12 blur-2xl" />
          <div className="absolute top-1/4 -right-20 w-[480px] h-[480px] bg-blue-200/25 rounded-[72px] -rotate-12 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 w-[420px] h-[420px] bg-blue-100/40 rounded-[64px] rotate-45 blur-2xl" />
        </div>

        {/* Centered Mobile Card Panel */}
        <div className="relative z-10 w-full max-w-[420px] bg-white sm:rounded-[36px] shadow-[0_20px_50px_rgba(37,99,235,0.07),0_4px_20px_rgba(15,23,42,0.03)] border-x sm:border border-white/80 overflow-hidden flex flex-col min-h-screen sm:min-h-[640px] my-auto">
          {/* Header Area with Subtle Blue Top Gradient */}
          <div className="bg-gradient-to-b from-[#DCEAFC]/75 via-[#F1F6FE]/70 to-white px-6 pt-5 pb-5 sm:px-7 sm:pt-6">
            {/* Top Bar: Back Button + Avatar */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => router.push("/rewards")}
                className="w-9 h-9 rounded-full bg-slate-200/60 hover:bg-slate-300/80 active:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                aria-label="Back to Rewards"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-2">
                {survey?.rewardCoins ? (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                    +{survey.rewardCoins} Coins
                  </span>
                ) : null}
                <div
                  className="w-9 h-9 rounded-full ring-2 ring-white shadow-xs overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold"
                  title={userName}
                >
                  {userInitials}
                </div>
              </div>
            </div>

            {/* Title & Blue Accent */}
            {renderStyledTitle(survey?.title || "Community Research Survey")}

            {/* Description */}
            <p className="text-[13px] text-slate-600 font-normal mt-2 leading-relaxed">
              {survey?.description || "Help us improve our services by answering a few quick questions!"}
            </p>
          </div>

          {/* Intro Content Body */}
          <div className="px-6 sm:px-7 pt-2 pb-8 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Duration</span>
                    <span className="text-xs font-bold text-slate-800">~{survey?.estimatedDurationMin || 3} mins</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Questions</span>
                    <span className="text-xs font-bold text-slate-800">{questionCountText}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Branching Notice if applicable */}
              {isDecisionBased && (
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100/80 flex items-start gap-2.5 text-xs text-blue-900">
                  <GitBranch className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold">Adaptive Branching:</strong> Questions adapt dynamically based on your previous answers.
                  </div>
                </div>
              )}

              {/* Privacy Reassurance */}
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold text-slate-800">100% Confidential:</strong> Responses are aggregated for residential care and research.
                </div>
              </div>

              {/* In-progress resume alert */}
              {isResumeAttempt && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>You have an in-progress response saved. Resuming will restore your answers.</span>
                </div>
              )}
            </div>

            {/* Start / Sign in Button */}
            <div className="pt-2 flex flex-col gap-2">
              {isAuthRequired ? (
                <button
                  type="button"
                  onClick={() => router.push(`/auth?from=${encodeURIComponent(`/surveys/${surveyId}`)}`)}
                  className="w-full h-11 sm:h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In with Mobile to Start</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setHasStarted(true)}
                  className="w-full h-11 sm:h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isResumeAttempt ? "Resume Survey" : "Start Survey"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/rewards"
                className="w-full py-2 text-center text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
              >
                Cancel and return to rewards
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // B. COMPLETION STATE (Celebratory Simple Card)
  // ---------------------------------------------------------------------------
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#EDF4FE] relative flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-[420px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(37,99,235,0.07)] border border-white/80 p-7 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <CheckCircle className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Survey Completed!
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed">
              {completionMessage || "Thank you for contributing your localized insights!"}
            </p>
          </div>

          {earnedCoins > 0 && (
            <div className="py-3 px-4 rounded-xl bg-amber-50/80 border border-amber-200/80 inline-flex items-center justify-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800 font-mono">
                +{earnedCoins} Reward Coins Credited
              </span>
            </div>
          )}

          <div className="pt-2">
            <Link
              href="/rewards"
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <span>Return to Rewards</span>
              <ArrowRight className="w-4 h-4" />
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
      <div className="min-h-screen bg-[#EDF4FE] relative flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(37,99,235,0.07)] border border-white/80 p-7 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Survey Concluded</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{completionMessage}</p>
          <Link
            href="/rewards"
            className="w-full h-10 rounded-xl bg-blue-600 text-white font-semibold text-xs flex items-center justify-center"
          >
            Return to Rewards
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // D. ACTIVE SURVEY SCREEN (Matching Screenshot 2026-10-25 104546.png Exactly)
  // ---------------------------------------------------------------------------
  const totalQuestions = applicableQuestions.length;
  const answeredCount = applicableQuestions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== ""
  ).length;

  return (
    <div className="min-h-screen bg-[#EDF4FE] relative flex flex-col items-center justify-start p-0 sm:p-6 md:p-8 overflow-x-hidden font-sans">
      {/* Background soft geometric accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200/30 rounded-[64px] rotate-12 blur-2xl" />
        <div className="absolute top-1/4 -right-20 w-[480px] h-[480px] bg-blue-200/25 rounded-[72px] -rotate-12 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 w-[420px] h-[420px] bg-blue-100/40 rounded-[64px] rotate-45 blur-2xl" />
      </div>

      {/* Main Single Centered Survey Panel (380-420px width) */}
      <div className="relative z-10 w-full max-w-[420px] bg-white sm:rounded-[36px] shadow-[0_20px_50px_rgba(37,99,235,0.07),0_4px_20px_rgba(15,23,42,0.03)] border-x sm:border border-white/80 overflow-hidden flex flex-col min-h-screen sm:min-h-[640px] my-auto">
        {/* Top Header with Subtle Blue Gradient */}
        <div className="bg-gradient-to-b from-[#DCEAFC]/75 via-[#F1F6FE]/70 to-white px-6 pt-5 pb-4 sm:px-7 sm:pt-6">
          {/* Top Bar: Back Button + Avatar */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => router.push("/rewards")}
              className="w-9 h-9 rounded-full bg-slate-200/60 hover:bg-slate-300/80 active:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              aria-label="Back to Rewards"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2">
              {survey?.rewardCoins ? (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                  +{survey.rewardCoins} Coins
                </span>
              ) : null}
              <div
                className="w-9 h-9 rounded-full ring-2 ring-white shadow-xs overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold"
                title={userName}
              >
                {userInitials}
              </div>
            </div>
          </div>

          {/* Survey Title with Blue Accent */}
          {renderStyledTitle(survey?.title || "User Experience Survey")}

          {/* Description */}
          <p className="text-[13px] text-slate-600 font-normal mt-2 leading-relaxed">
            {survey?.description || "Help us improve our services by answering a few questions!"}
          </p>

          {/* Subtle Progress Strip */}
          <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {answeredCount} of {totalQuestions} answered
            </span>
            <span>
              {saveStatus === "SAVING" ? (
                <span className="flex items-center gap-1 text-slate-400">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Saving
                </span>
              ) : saveStatus === "SAVED" ? (
                <span className="text-blue-600 font-medium">Autosaved</span>
              ) : (
                <span className="text-amber-500">Offline</span>
              )}
            </span>
          </div>
        </div>

        {/* Vertically Scrollable Questions Container */}
        <div className="px-6 sm:px-7 pt-2 pb-8 flex-1 flex flex-col justify-between space-y-6">
          {/* Stacked Questions */}
          <div className="space-y-6 sm:space-y-7">
            {applicableQuestions.map((q, idx) => (
              <div key={q.id} id={`q-${q.id}`}>
                <QuestionRenderer
                  index={idx}
                  question={q}
                  value={answers[q.id]}
                  onChange={(val) => handleAnswerChange(q.id, val)}
                  error={fieldErrors[q.id]}
                />
              </div>
            ))}
          </div>

          {/* General Error notice */}
          {generalError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Bottom Action Button (Submit) */}
          <div className="pt-4 border-t border-slate-100/90 space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full h-11 sm:h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Survey & Claim +{survey?.rewardCoins || 0} Coins</span>
              )}
            </button>

            <div className="text-center">
              <span className="text-[10px] text-slate-400">
                Responses are private and automatically encrypted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
