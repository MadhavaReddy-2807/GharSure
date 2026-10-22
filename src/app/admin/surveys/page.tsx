"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  Save,
  Trash2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface Survey {
  id: string;
  survey_id: string;
  title: string;
  description: string | null;
  category: string;
  estimated_duration_min: number;
  reward_coins: number;
  response_quota: number;
  status: string;
  version: number;
  created_at: string;
  questions_count: number;
  completions_count: number;
}

interface Question {
  orderNum: number;
  questionText: string;
  questionType: string;
  options: string[];
  isRequired: boolean;
}

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  TESTING: "bg-purple-50 text-purple-700 border-purple-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  SCHEDULED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  CLOSED: "bg-red-50 text-red-700 border-red-200",
  ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
};

const NEXT_STATES: Record<string, string[]> = {
  DRAFT: ["TESTING", "ARCHIVED"],
  TESTING: ["APPROVED", "DRAFT", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["PAUSED", "CLOSED", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "CLOSED", "ARCHIVED"],
  CLOSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSurveyId, setNewSurveyId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Water Quality");
  const [newDuration, setNewDuration] = useState(5);
  const [newCoins, setNewCoins] = useState(50);
  const [newQuota, setNewQuota] = useState(500);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Question Builder Drawer state
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  const fetchSurveys = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/surveys");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load surveys");
      setSurveys(data.surveys);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setError("");

    try {
      const res = await fetch("/api/admin/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: newSurveyId,
          title: newTitle,
          category: newCategory,
          estimatedDurationMin: Number(newDuration),
          rewardCoins: Number(newCoins),
          responseQuota: Number(newQuota),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create survey");

      setSuccess(`Survey ${newSurveyId} created successfully in DRAFT state.`);
      setIsCreateOpen(false);
      setNewSurveyId("");
      setNewTitle("");
      fetchSurveys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenQuestions = async (survey: Survey) => {
    setActiveSurvey(survey);
    setIsLoadingQuestions(true);
    try {
      const res = await fetch(`/api/admin/surveys/${survey.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setQuestions(
          (data.survey.questions || []).map((q: any) => ({
            orderNum: q.order_num,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options || [],
            isRequired: q.is_required,
          }))
        );
      }
    } catch {
      // Handled
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        orderNum: questions.length + 1,
        questionText: "",
        questionType: "SINGLE_CHOICE",
        options: ["Option 1", "Option 2"],
        isRequired: true,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderNum: i + 1 }));
    setQuestions(updated);
  };

  const handleSaveQuestions = async () => {
    if (!activeSurvey) return;
    setIsSavingQuestions(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/surveys/${activeSurvey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save questions");
      setSuccess("Survey questions saved and version incremented.");
      setActiveSurvey(null);
      fetchSurveys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleTransitionState = async (surveyId: string, nextState: string) => {
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Transition failed");
      setSuccess(`Survey status transitioned to ${nextState}.`);
      fetchSurveys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Surveys & Form Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative research surveys, question branching, quotas, and coin incentives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Survey</span>
          </button>
          <button
            onClick={() => fetchSurveys()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Surveys Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Survey ID</th>
                <th className="px-5 py-3.5">Title & Category</th>
                <th className="px-5 py-3.5">Questions</th>
                <th className="px-5 py-3.5">Reward</th>
                <th className="px-5 py-3.5">Responses / Quota</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading surveys...</span>
                  </td>
                </tr>
              ) : surveys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No surveys created yet.
                  </td>
                </tr>
              ) : (
                surveys.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">
                      {s.survey_id}
                      <span className="block text-[10px] text-slate-400 font-sans font-normal">
                        v{s.version}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900 max-w-xs">{s.title}</div>
                      <div className="text-[11px] text-slate-400">{s.category} · {s.estimated_duration_min}m</div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {s.questions_count} questions
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-amber-600">
                      +{s.reward_coins} Coins
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      <span className="font-semibold text-slate-900">{s.completions_count}</span>
                      <span className="text-slate-400"> / {s.response_quota}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_BADGES[s.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenQuestions(s)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                        >
                          Questions ({s.questions_count})
                        </button>

                        {/* Transition buttons */}
                        {(NEXT_STATES[s.status] || []).map((target) => (
                          <button
                            key={target}
                            onClick={() => handleTransitionState(s.id, target)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-[10px] transition-colors uppercase tracking-wider"
                          >
                            Set {target}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Survey Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">Create New Survey Draft</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSurvey} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Survey Identifier
                  </label>
                  <input
                    type="text"
                    value={newSurveyId}
                    onChange={(e) => setNewSurveyId(e.target.value.toUpperCase())}
                    placeholder="SURV-WATER-02"
                    required
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Water Quality">Water Quality</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Energy & Power">Energy & Power</option>
                    <option value="Home Maintenance">Home Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Survey Title (Public facing)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Water Hardness & Purifier Longevity Study"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Min)
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    min={1}
                    max={60}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reward Coins
                  </label>
                  <input
                    type="number"
                    value={newCoins}
                    onChange={(e) => setNewCoins(Number(e.target.value))}
                    min={0}
                    max={1000}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quota Cap
                  </label>
                  <input
                    type="number"
                    value={newQuota}
                    onChange={(e) => setNewQuota(Number(e.target.value))}
                    min={10}
                    max={50000}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmittingCreate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Survey</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Builder Drawer */}
      {activeSurvey && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  Question Builder: {activeSurvey.survey_id}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {activeSurvey.title} · v{activeSurvey.version}
                </p>
              </div>
              <button
                onClick={() => setActiveSurvey(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoadingQuestions ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading questions...
                </div>
              ) : questions.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  No questions defined. Click &ldquo;Add Question&rdquo; below to start.
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        Q{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].isRequired = e.target.checked;
                              setQuestions(updated);
                            }}
                            className="rounded text-brand-orange focus:ring-brand-orange"
                          />
                          <span>Required</span>
                        </label>
                        <button
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].questionText = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder="Enter question text..."
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                          Type
                        </label>
                        <select
                          value={q.questionType}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].questionType = e.target.value;
                            setQuestions(updated);
                          }}
                          className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                        >
                          <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                          <option value="MULTIPLE_CHOICE">Multiple Choice (Checkbox)</option>
                          <option value="TEXT">Freeform Text</option>
                          <option value="RATING">Rating (1-5)</option>
                        </select>
                      </div>

                      {q.questionType !== "TEXT" && q.questionType !== "RATING" && (
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                            Options (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={q.options.join(", ")}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].options = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              setQuestions(updated);
                            }}
                            placeholder="Option 1, Option 2"
                            className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setActiveSurvey(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestions}
                disabled={isSavingQuestions}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSavingQuestions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Question Definitions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
