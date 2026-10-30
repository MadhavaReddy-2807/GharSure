"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Coins,
  ClipboardList,
  Upload,
  Vote,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  X,
  FileCheck,
} from "lucide-react";
import { FileActivityRecord, QuickPollRecord } from "@/lib/rewards-activities-db";

interface RewardsClientProps {
  initialSurveys: any[];
  initialFileActivities: FileActivityRecord[];
  initialQuickPolls: QuickPollRecord[];
  initialCoins: number;
  isLoggedIn: boolean;
}

export function RewardsClientView({
  initialSurveys,
  initialFileActivities,
  initialQuickPolls,
  initialCoins,
  isLoggedIn,
}: RewardsClientProps) {
  const [balance, setBalance] = useState(initialCoins);
  const [surveys] = useState(initialSurveys);
  const [fileActivities, setFileActivities] = useState(initialFileActivities);
  const [quickPolls, setQuickPolls] = useState(initialQuickPolls);

  // Active Tab: "ALL" | "SURVEYS" | "FILES" | "POLLS"
  const [activeTab, setActiveTab] = useState<"ALL" | "SURVEYS" | "FILES" | "POLLS">("ALL");

  // File Upload Modal State
  const [uploadActivity, setUploadActivity] = useState<FileActivityRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileSuccess, setFileSuccess] = useState("");

  // Poll Voting State
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string[]>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [pollMessages, setPollMessages] = useState<Record<string, string>>({});

  // Stats
  const activeSurveys = surveys.filter(
    (s) => s.userStatus === "AVAILABLE" || s.userStatus === "IN_PROGRESS" || s.userStatus === "STARTED"
  );
  const openFileActivities = fileActivities.filter((fa) => !fa.userSubmission || fa.userSubmission.status === "REJECTED");
  const openPolls = quickPolls.filter((p) => !p.hasVoted);

  const potentialCoins =
    activeSurveys.reduce((sum, s) => sum + (s.rewardCoins || 0), 0) +
    openFileActivities.reduce((sum, fa) => sum + fa.coin_reward, 0) +
    openPolls.reduce((sum, p) => sum + p.coin_reward, 0);

  // Handle Poll Option Select
  const handleSelectOption = (pollId: string, optionId: string, pollType: string) => {
    if (pollType === "SINGLE_CHOICE") {
      setSelectedPollOptions((prev) => ({ ...prev, [pollId]: [optionId] }));
    } else {
      setSelectedPollOptions((prev) => {
        const current = prev[pollId] || [];
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [pollId]: next };
      });
    }
  };

  // Submit Quick Poll Vote
  const handleVotePoll = async (pollId: string) => {
    const selected = selectedPollOptions[pollId] || [];
    if (selected.length === 0) {
      setPollMessages((prev) => ({ ...prev, [pollId]: "Please select an answer first." }));
      return;
    }

    setVotingPollId(pollId);
    setPollMessages((prev) => ({ ...prev, [pollId]: "" }));

    try {
      const res = await fetch("/api/rewards/activities/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, selectedOptionIds: selected }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPollMessages((prev) => ({ ...prev, [pollId]: data.error || "Failed to submit vote." }));
        return;
      }

      setBalance(data.newBalance ?? balance + (data.coinsAwarded || 15));
      setPollMessages((prev) => ({ ...prev, [pollId]: data.message }));

      // Update local poll state to show voted & vote counts
      setQuickPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const updatedOptions = p.options.map((opt) => {
            const isChosen = selected.includes(opt.id);
            const newCount = isChosen ? opt.vote_count + 1 : opt.vote_count;
            return { ...opt, vote_count: newCount };
          });
          const newTotal = p.totalVotes + 1;
          return {
            ...p,
            hasVoted: true,
            userVotedOptionIds: selected,
            totalVotes: newTotal,
            options: updatedOptions.map((opt) => ({
              ...opt,
              vote_percentage: newTotal > 0 ? Math.round((opt.vote_count / newTotal) * 100) : 0,
            })),
          };
        })
      );
    } catch {
      setPollMessages((prev) => ({ ...prev, [pollId]: "An unexpected error occurred." }));
    } finally {
      setVotingPollId(null);
    }
  };

  // Submit Document File
  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadActivity || !selectedFile) {
      setFileError("Please select a file to upload.");
      return;
    }

    if (selectedFile.size > uploadActivity.max_file_size_bytes) {
      setFileError(`File exceeds maximum size of ${(uploadActivity.max_file_size_bytes / (1024 * 1024)).toFixed(1)} MB.`);
      return;
    }

    setIsSubmittingFile(true);
    setFileError("");
    setFileSuccess("");

    try {
      // Create a deterministic simulated secure storage path for prototype/production
      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `submissions/${uploadActivity.id}/${Date.now()}_${safeFileName}`;

      const res = await fetch("/api/rewards/activities/files/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: uploadActivity.id,
          fileName: selectedFile.name,
          fileUrl: storagePath,
          fileSizeBytes: selectedFile.size,
          mimeType: selectedFile.type || "application/pdf",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFileError(data.error || "Failed to submit document.");
        return;
      }

      setFileSuccess(data.message || "Document submitted successfully for verification.");

      // Update local activity state
      setFileActivities((prev) =>
        prev.map((fa) => {
          if (fa.id !== uploadActivity.id) return fa;
          return {
            ...fa,
            userSubmission: {
              id: data.submissionId || `sub-${Date.now()}`,
              status: "SUBMITTED",
              file_name: selectedFile.name,
              created_at: new Date().toISOString(),
            },
          };
        })
      );

      setTimeout(() => {
        setUploadActivity(null);
        setSelectedFile(null);
        setFileSuccess("");
      }, 1800);
    } catch {
      setFileError("Failed to upload document. Please check your network connection.");
    } finally {
      setIsSubmittingFile(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      {/* 1. MINIMAL HEADER & BALANCE OVERVIEW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Rewards & Activities
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Participate in research surveys, upload household reports, and answer quick polls to earn coins.
          </p>
        </div>

        {/* Clean Balance & Store Link */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Available Balance
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900 flex items-center justify-end gap-1">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{balance.toLocaleString()} Coins</span>
            </div>
          </div>
          <Link
            href="/store"
            className="px-3.5 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Store
          </Link>
        </div>
      </div>

      {/* 2. ACTIVITY FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "ALL"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          All Activities ({activeSurveys.length + openFileActivities.length + openPolls.length})
        </button>
        <button
          onClick={() => setActiveTab("SURVEYS")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "SURVEYS"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Surveys ({activeSurveys.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("FILES")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "FILES"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Files ({openFileActivities.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("POLLS")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "POLLS"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Quick Polls ({openPolls.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: PARTICIPATE IN A SURVEY                                    */}
      {/* ===================================================================== */}
      {(activeTab === "ALL" || activeTab === "SURVEYS") && (
        <section aria-labelledby="surveys-heading" className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div>
              <h2 id="surveys-heading" className="text-sm font-bold uppercase tracking-wider text-slate-800">
                1. Participate in a Survey
              </h2>
              <p className="text-xs text-slate-500">
                Detailed research surveys with instant coin crediting upon verified completion.
              </p>
            </div>
          </div>

          {activeSurveys.length === 0 ? (
            <div className="p-6 rounded-lg border border-slate-200 bg-white text-center">
              <ClipboardList className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-500">All available surveys are currently completed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeSurveys.map((survey) => {
                const isInProgress = survey.userStatus === "IN_PROGRESS" || survey.userStatus === "STARTED";
                return (
                  <div
                    key={survey.id}
                    className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {survey.category || "Research Study"}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          +{survey.rewardCoins} Coins
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">{survey.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {survey.description || "Help improve household solutions and everyday essentials."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{survey.estimatedDurationMin || 3} mins</span>
                      </div>

                      <Link
                        href={`/surveys/${survey.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shadow-sm"
                      >
                        <span>{isInProgress ? "Resume" : "Start Survey"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: UPLOAD AN IMAGE OR FILE                                   */}
      {/* ===================================================================== */}
      {(activeTab === "ALL" || activeTab === "FILES") && (
        <section aria-labelledby="files-heading" className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div>
              <h2 id="files-heading" className="text-sm font-bold uppercase tracking-wider text-slate-800">
                2. Upload an Image or File
              </h2>
              <p className="text-xs text-slate-500">
                Upload requested reports or receipts to receive coins verified by our team.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fileActivities.map((act) => {
              const sub = act.userSubmission;

              return (
                <div
                  key={act.id}
                  className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Document Upload
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{act.coin_reward} Coins
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">{act.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{act.description}</p>
                    {act.instructions && (
                      <p className="text-[11px] text-slate-400 mt-1.5 italic bg-slate-50 p-2 rounded border border-slate-100">
                        Instructions: {act.instructions}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {sub ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              sub.status === "APPROVED" || sub.status === "REWARD_CREDITED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : sub.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {sub.status === "REWARD_CREDITED" ? "Reward Credited" : sub.status.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {sub.file_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">PDF, PNG, JPG (up to 10MB)</span>
                      )}
                    </div>

                    {!sub || sub.status === "REJECTED" ? (
                      <button
                        onClick={() => {
                          setUploadActivity(act);
                          setSelectedFile(null);
                          setFileError("");
                          setFileSuccess("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{sub?.status === "REJECTED" ? "Re-upload" : "Upload File"}</span>
                      </button>
                    ) : (
                      <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submitted</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* SECTION 3: QUICK POLLS                                                */}
      {/* ===================================================================== */}
      {(activeTab === "ALL" || activeTab === "POLLS") && (
        <section aria-labelledby="polls-heading" className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div>
              <h2 id="polls-heading" className="text-sm font-bold uppercase tracking-wider text-slate-800">
                3. Quick Polls
              </h2>
              <p className="text-xs text-slate-500">
                One-click perspectives on community water & home care. Earn instant coins.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickPolls.map((poll) => {
              const selected = selectedPollOptions[poll.id] || poll.userVotedOptionIds || [];
              const isVoting = votingPollId === poll.id;
              const msg = pollMessages[poll.id];

              return (
                <div
                  key={poll.id}
                  className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {poll.poll_type === "SINGLE_CHOICE" ? "Single Choice Poll" : "Multiple Choice Poll"}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{poll.coin_reward} Coins
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">{poll.question}</h3>

                    {/* Options List */}
                    <div className="space-y-2 mt-3">
                      {poll.options.map((opt) => {
                        const isChosen = selected.includes(opt.id);

                        return (
                          <div
                            key={opt.id}
                            onClick={() => !poll.hasVoted && handleSelectOption(poll.id, opt.id, poll.poll_type)}
                            className={`p-2.5 rounded-md border text-xs transition-all relative overflow-hidden ${
                              poll.hasVoted
                                ? isChosen
                                  ? "border-blue-300 bg-blue-50/50 text-slate-900 font-medium"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                                : isChosen
                                ? "border-blue-500 bg-blue-50/80 text-blue-900 font-medium cursor-pointer"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                            }`}
                          >
                            {/* Vote Percentage Bar if Voted */}
                            {poll.hasVoted && (
                              <div
                                className="absolute inset-y-0 left-0 bg-blue-100/70 -z-0 transition-all duration-500"
                                style={{ width: `${opt.vote_percentage || 0}%` }}
                              />
                            )}

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                                    isChosen
                                      ? "bg-[#2563EB] border-[#2563EB] text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isChosen && "✓"}
                                </div>
                                <span>{opt.option_text}</span>
                              </div>

                              {poll.hasVoted && (
                                <span className="font-mono text-[11px] text-slate-500 font-semibold ml-2">
                                  {opt.vote_percentage || 0}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {poll.totalVotes} response{poll.totalVotes === 1 ? "" : "s"}
                    </span>

                    {poll.hasVoted ? (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed (+{poll.coin_reward} Coins)</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVotePoll(poll.id)}
                        disabled={isVoting || selected.length === 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                      >
                        {isVoting && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Submit Answer</span>
                      </button>
                    )}
                  </div>

                  {msg && (
                    <div
                      className={`mt-2 text-xs p-2 rounded ${
                        msg.includes("earned") || msg.includes("registered")
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* FILE UPLOAD MODAL                                                     */}
      {/* ===================================================================== */}
      {uploadActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Upload Document</h3>
              </div>
              <button
                onClick={() => setUploadActivity(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800">{uploadActivity.title}</span>
              <p className="text-xs text-slate-500">{uploadActivity.description}</p>
              {uploadActivity.instructions && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                  {uploadActivity.instructions}
                </p>
              )}
            </div>

            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="document-file-input"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setFileError("");
                  }}
                  className="hidden"
                />
                <label htmlFor="document-file-input" className="cursor-pointer space-y-1 block">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-semibold text-blue-600 hover:underline block">
                    {selectedFile ? selectedFile.name : "Choose a file to upload"}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Supported: PDF, JPG, PNG (Max {(uploadActivity.max_file_size_bytes / (1024 * 1024)).toFixed(0)}MB)
                  </span>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 text-xs text-slate-700 border border-slate-200">
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}

              {fileError && (
                <div className="flex items-center gap-1.5 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {fileSuccess && (
                <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                  <FileCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{fileSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadActivity(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFile || !selectedFile}
                  className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isSubmittingFile && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Submit for +{uploadActivity.coin_reward} Coins</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
