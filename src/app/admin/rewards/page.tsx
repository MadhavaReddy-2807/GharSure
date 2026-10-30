"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  PlusCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  FileText,
  Vote,
  History,
  Check,
  Ban,
  UploadCloud,
  FileCheck,
  Eye,
  Plus,
} from "lucide-react";

interface Transaction {
  id: string;
  customer_id: string;
  readable_customer_id: string;
  customer_name: string | null;
  phone_e164: string;
  amount: number;
  type: string;
  description: string;
  idempotency_key: string;
  admin_email?: string | null;
  created_at: string;
}

interface FileSubmissionItem {
  id: string;
  activity_id: string;
  customer_id: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REWARD_CREDITED";
  rejection_reason?: string;
  reviewer_notes?: string;
  reviewer_name?: string;
  activity_title: string;
  activity_coin_reward: number;
  customer_name?: string;
  customer_phone?: string;
  readable_customer_id?: string;
  created_at: string;
}

interface FileActivityItem {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  document_type: string;
  coin_reward: number;
  approval_required: boolean;
  status: string;
  total_submissions?: number;
  pending_submissions?: number;
}

interface QuickPollItem {
  id: string;
  title: string;
  question: string;
  poll_type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  coin_reward: number;
  status: string;
  total_responses?: number;
  options: { id: string; option_text: string; vote_count: number }[];
}

export default function AdminRewardsPage() {
  const [activeTab, setActiveTab] = useState<"LEDGER" | "SUBMISSIONS" | "ACTIVITIES" | "POLLS">("SUBMISSIONS");

  // Ledger state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);

  // Submissions state
  const [submissions, setFileSubmissions] = useState<FileSubmissionItem[]>([]);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("ALL");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<FileSubmissionItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Activities state
  const [fileActivities, setFileActivities] = useState<FileActivityItem[]>([]);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actInstructions, setActInstructions] = useState("");
  const [actDocType, setActDocType] = useState("TDS_REPORT");
  const [actReward, setActReward] = useState(50);
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  // Polls state
  const [quickPolls, setQuickPolls] = useState<QuickPollItem[]>([]);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollType, setPollType] = useState<"SINGLE_CHOICE" | "MULTIPLE_CHOICE">("SINGLE_CHOICE");
  const [pollReward, setPollReward] = useState(15);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isSavingPoll, setIsSavingPoll] = useState(false);

  // Shared UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Adjustment Modal State
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState("");
  const [amount, setAmount] = useState<number>(50);
  const [reasonCode, setReasonCode] = useState("SUPPORT_GOODWILL");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rewards?limit=50");
      const data = await res.json();
      if (res.ok && data.success) {
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      }
    } catch (err: any) {
      console.warn("Error fetching ledger:", err.message);
    }
  }, []);

  const fetchSubmissionsAndActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rewards/activities/files");
      const data = await res.json();
      if (res.ok && data.success) {
        setFileActivities(data.activities || []);
        setFileSubmissions(data.submissions || []);
      }
    } catch (err: any) {
      console.warn("Error fetching submissions:", err.message);
    }
  }, []);

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rewards/activities/polls");
      const data = await res.json();
      if (res.ok && data.success) {
        setQuickPolls(data.polls || []);
      }
    } catch (err: any) {
      console.warn("Error fetching polls:", err.message);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError("");
    await Promise.all([fetchLedger(), fetchSubmissionsAndActivities(), fetchPolls()]);
    setIsLoading(false);
  }, [fetchLedger, fetchSubmissionsAndActivities, fetchPolls]);

  useEffect(() => {
    refreshAll();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab")?.toUpperCase();
      if (tab === "POLLS" || tab === "ACTIVITIES" || tab === "SUBMISSIONS" || tab === "LEDGER") {
        setActiveTab(tab as any);
      }
      if (params.get("create") === "poll" || params.get("poll") === "new") {
        setActiveTab("POLLS");
        setIsPollModalOpen(true);
      } else if (params.get("create") === "activity") {
        setActiveTab("ACTIVITIES");
        setIsActivityModalOpen(true);
      }
    }
  }, [refreshAll]);

  // Handle Approve Submission
  const handleApproveSubmission = async (sub: FileSubmissionItem) => {
    setReviewingId(sub.id);
    setError("");
    try {
      const res = await fetch("/api/admin/rewards/activities/files/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: sub.id, decision: "APPROVE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Approval failed");

      setSuccess(data.message || "Submission approved and coins credited!");
      fetchSubmissionsAndActivities();
      fetchLedger();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  // Handle Reject Submission
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setReviewingId(rejectModalItem.id);
    setError("");
    try {
      const res = await fetch("/api/admin/rewards/activities/files/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: rejectModalItem.id,
          decision: "REJECT",
          rejectionReason: rejectionReason.trim() || "Document does not satisfy requirements",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Rejection failed");

      setSuccess("Submission rejected with feedback.");
      setRejectModalItem(null);
      setRejectionReason("");
      fetchSubmissionsAndActivities();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  // Create File Activity
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingActivity(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rewards/activities/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: actTitle.trim(),
          description: actDesc.trim(),
          instructions: actInstructions.trim(),
          documentType: actDocType,
          coinReward: Number(actReward),
          approvalRequired: true,
          status: "PUBLISHED",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create activity");

      setSuccess("File activity campaign published!");
      setIsActivityModalOpen(false);
      setActTitle("");
      setActDesc("");
      fetchSubmissionsAndActivities();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingActivity(false);
    }
  };

  // Create Quick Poll
  const handleSavePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      setError("Please provide at least two valid options for the poll.");
      return;
    }

    setIsSavingPoll(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rewards/activities/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pollTitle.trim(),
          question: pollQuestion.trim(),
          pollType,
          coinReward: Number(pollReward),
          status: "PUBLISHED",
          options: cleanOpts,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create poll");

      setSuccess("Quick poll published successfully!");
      setIsPollModalOpen(false);
      setPollTitle("");
      setPollQuestion("");
      setPollOptions(["", ""]);
      fetchPolls();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingPoll(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (submissionStatusFilter === "ALL") return true;
    return s.status === submissionStatusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Rewards & Activities Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin review queue for document uploads, quick polls management, and audited coin ledger transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("POLLS");
              setIsPollModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Create Quick Poll</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("ACTIVITIES");
              setIsActivityModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Create File Activity</span>
          </button>

          <button
            onClick={() => setIsAdjustmentOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Adjust Coins</span>
          </button>

          <button
            onClick={() => refreshAll()}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Hub"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("SUBMISSIONS")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "SUBMISSIONS" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Document Review Queue ({submissions.filter((s) => s.status === "SUBMITTED").length} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab("ACTIVITIES")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "ACTIVITIES" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Activities ({fileActivities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("POLLS")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "POLLS" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Quick Polls ({quickPolls.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "LEDGER" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Coin Ledger ({total})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DOCUMENT SUBMISSIONS REVIEW QUEUE                                 */}
      {/* ========================================================================= */}
      {activeTab === "SUBMISSIONS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800">
              User Submitted Reports (TDS, Invoices, Care Bills)
            </span>

            <div className="flex items-center gap-2">
              <select
                value={submissionStatusFilter}
                onChange={(e) => setSubmissionStatusFilter(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="SUBMITTED">Submitted (Pending Review)</option>
                <option value="APPROVED">Approved & Rewarded</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">No document submissions in this queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-3">Activity & Document</th>
                      <th className="py-3 px-3">Reward</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Submitted At</th>
                      <th className="py-3 px-4 text-right">Review Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const isPending = sub.status === "SUBMITTED" || sub.status === "UNDER_REVIEW";

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{sub.customer_name || "Household User"}</span>
                            <span className="text-[11px] text-slate-400">{sub.customer_phone || sub.readable_customer_id}</span>
                          </td>

                          <td className="py-3.5 px-3 max-w-xs">
                            <span className="font-semibold text-slate-900 block">{sub.activity_title}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500 truncate max-w-[150px]">{sub.file_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({(sub.file_size_bytes / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            </div>
                            {sub.rejection_reason && (
                              <span className="text-[10px] text-rose-600 block mt-0.5 italic">
                                Rejection: {sub.rejection_reason}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono font-bold text-amber-700">
                            +{sub.activity_coin_reward} Coins
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                sub.status === "APPROVED" || sub.status === "REWARD_CREDITED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : sub.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                              }`}
                            >
                              {sub.status === "REWARD_CREDITED" ? "Rewarded" : sub.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                            {new Date(sub.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleApproveSubmission(sub)}
                                    disabled={reviewingId === sub.id}
                                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  >
                                    {reviewingId === sub.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    <span>Approve (+{sub.activity_coin_reward})</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRejectModalItem(sub);
                                      setRejectionReason("");
                                    }}
                                    disabled={reviewingId === sub.id}
                                    className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400">Reviewed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UPLOAD ACTIVITIES CONFIGURATION                                   */}
      {/* ========================================================================= */}
      {activeTab === "ACTIVITIES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-xs font-bold text-slate-800">Admin Document Activities</h2>
              <p className="text-[11px] text-slate-500">
                Configure requested household documents that appear on the user Rewards page.
              </p>
            </div>

            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Activity</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fileActivities.map((act) => (
              <div key={act.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {act.document_type}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{act.coin_reward} Coins
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{act.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{act.description}</p>
                  {act.instructions && (
                    <p className="text-[11px] text-slate-400 mt-1 italic bg-slate-50 p-2 rounded">
                      Instructions: {act.instructions}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{act.total_submissions ?? 0} total submissions</span>
                  <span className="font-bold text-emerald-600">{act.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUICK POLLS MANAGEMENT                                            */}
      {/* ========================================================================= */}
      {activeTab === "POLLS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-xs font-bold text-slate-800">Admin Quick Polls</h2>
              <p className="text-[11px] text-slate-500">
                Single and multiple choice questions for rapid community research.
              </p>
            </div>

            <button
              onClick={() => setIsPollModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Quick Poll</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickPolls.map((poll) => (
              <div key={poll.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {poll.poll_type}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{poll.coin_reward} Coins
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{poll.question}</h3>
                </div>

                <div className="space-y-1.5 pt-1">
                  {poll.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className="p-2 rounded bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
                    >
                      <span className="text-slate-700">{opt.option_text}</span>
                      <span className="font-mono text-slate-400 font-bold">{opt.vote_count || 0} votes</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{poll.total_responses ?? 0} responses</span>
                  <span className="font-bold text-emerald-600">{poll.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COIN LEDGER & AUDITED ADJUSTMENTS                                 */}
      {/* ========================================================================= */}
      {activeTab === "LEDGER" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800">
              Authoritative Coin Ledger ({total} Transactions)
            </span>
            <span className="text-xs text-slate-500">Every reward, poll, and voucher spend is audited.</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Idempotency Key</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{tx.customer_name || "Household User"}</span>
                        <span className="text-[11px] text-slate-400">{tx.phone_e164 || tx.readable_customer_id}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 font-mono font-bold ${
                          tx.amount > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{tx.description}</td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                        {tx.idempotency_key}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECT SUBMISSION MODAL                                                  */}
      {/* ========================================================================= */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reject Document Submission</h3>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800">{rejectModalItem.file_name}</span>
              <p className="text-xs text-slate-500">
                Please enter a concise reason for rejecting this document so the user can re-upload if needed.
              </p>
            </div>

            <div>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Image blurry, parameters not clearly legible, or missing date of test..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={reviewingId === rejectModalItem.id}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {reviewingId === rejectModalItem.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE FILE ACTIVITY MODAL                                               */}
      {/* ========================================================================= */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create Document Upload Campaign</h3>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Upload Your Electricity Bill / Power Tariff"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Document Type *</label>
                  <select
                    value={actDocType}
                    onChange={(e) => setActDocType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                  >
                    <option value="TDS_REPORT">Water Lab / TDS Report</option>
                    <option value="INVOICE">Product Invoice / Bill</option>
                    <option value="UTILITY_BILL">Utility / Maintenance Bill</option>
                    <option value="HOUSEHOLD_PHOTO">Household Photo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Coin Reward *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={actReward}
                    onChange={(e) => setActReward(parseInt(e.target.value, 10) || 50)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  placeholder="Tell users why this document is requested and what they will earn..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Instructions for User</label>
                <textarea
                  rows={2}
                  value={actInstructions}
                  onChange={(e) => setActInstructions(e.target.value)}
                  placeholder="e.g. Photo must be clear, showing account number and date..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingActivity}
                  className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingActivity && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Activity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE QUICK POLL MODAL                                                  */}
      {/* ========================================================================= */}
      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create Quick Poll</h3>
              <button
                onClick={() => setIsPollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePoll} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Poll Title *</label>
                <input
                  type="text"
                  required
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="e.g. Geyser Servicing Frequency Poll"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Question Text *</label>
                <textarea
                  rows={2}
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. How often do you descale or service your bathroom geyser?"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Poll Type *</label>
                  <select
                    value={pollType}
                    onChange={(e: any) => setPollType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                  >
                    <option value="SINGLE_CHOICE">Single Choice</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Coin Reward *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pollReward}
                    onChange={(e) => setPollReward(parseInt(e.target.value, 10) || 15)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>
              </div>

              {/* Poll Options */}
              <div className="space-y-2 pt-1">
                <label className="block text-slate-700 font-semibold">Answer Options *</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-xs font-semibold text-brand-purple hover:underline cursor-pointer block pt-1"
                >
                  + Add Option
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPoll}
                  className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingPoll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Poll</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
