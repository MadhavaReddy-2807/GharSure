"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Trash2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  BarChart3,
  FileSpreadsheet,
  Eye,
  GitBranch,
  CheckCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Coins,
  Clock,
  Search,
  Download,
  Filter,
  Pencil,
  Play,
  Pause,
} from "lucide-react";
import {
  validateSurveyDefinition,
  QuestionType,
  SurveyType,
  Operator,
  BranchAction,
} from "@/lib/survey-engine";

interface Survey {
  id: string;
  survey_id: string;
  title: string;
  description: string | null;
  category: string;
  survey_type: SurveyType;
  estimated_duration_min: number;
  reward_coins: number;
  response_quota: number;
  allow_resume: boolean;
  allow_review: boolean;
  status: string;
  version: number;
  created_at: string;
  published_at: string | null;
  questions_count: number;
  completions_count: number;
}

interface QuestionFormItem {
  id: string;
  orderNum: number;
  questionText: string;
  questionType: QuestionType;
  description: string;
  options: string[];
  matrixRows?: string[];
  matrixCols?: string[];
  isRequired: boolean;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  branchingRules?: Array<{
    id?: string;
    conditions: Array<{
      questionId: string;
      operator: Operator;
      value?: any;
    }>;
    matchType: "ALL" | "ANY";
    action: BranchAction;
    targetQuestionId?: string;
    disqualificationReason?: string;
  }>;
  sectionName?: string;
}

const QUESTION_TYPES: Array<{ value: QuestionType; label: string; group: string }> = [
  { value: "SINGLE_CHOICE", label: "Single Choice (Radio)", group: "Choice" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice (Checkboxes)", group: "Choice" },
  { value: "DROPDOWN", label: "Dropdown Select", group: "Choice" },
  { value: "SHORT_TEXT", label: "Short Text (Single Line)", group: "Text" },
  { value: "LONG_TEXT", label: "Long Text (Paragraph)", group: "Text" },
  { value: "NUMBER", label: "Number Input", group: "Numeric" },
  { value: "YES_NO", label: "Yes / No Toggle", group: "Binary" },
  { value: "RATING_SCALE", label: "Rating Scale (1-5 or 1-10)", group: "Rating" },
  { value: "STAR_RATING", label: "Star Rating (1-5 Stars)", group: "Rating" },
  { value: "DATE", label: "Date Picker", group: "Date" },
  { value: "MATRIX", label: "Grid / Matrix Questions", group: "Advanced" },
];

const OPERATORS: Array<{ value: Operator; label: string }> = [
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Does not equal" },
  { value: "CONTAINS", label: "Contains" },
  { value: "DOES_NOT_CONTAIN", label: "Does not contain" },
  { value: "GREATER_THAN", label: "Greater than (>)" },
  { value: "LESS_THAN", label: "Less than (<)" },
  { value: "GREATER_THAN_OR_EQUAL", label: "Greater than or equal (>=)" },
  { value: "LESS_THAN_OR_EQUAL", label: "Less than or equal (<=)" },
  { value: "IS_ANSWERED", label: "Is answered (not empty)" },
  { value: "IS_NOT_ANSWERED", label: "Is not answered (empty)" },
];

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
  DRAFT: ["TESTING", "PUBLISHED", "ARCHIVED"],
  TESTING: ["APPROVED", "PUBLISHED", "DRAFT", "ARCHIVED"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "DRAFT"],
  SCHEDULED: ["PUBLISHED", "APPROVED", "DRAFT"],
  PUBLISHED: ["PAUSED", "CLOSED", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "CLOSED", "ARCHIVED"],
  CLOSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [builderSurvey, setBuilderSurvey] = useState<Survey | null>(null);
  const [builderTab, setBuilderTab] = useState<"questions" | "logic" | "settings" | "publish">("questions");
  const [questions, setQuestions] = useState<QuestionFormItem[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [surveyDetails, setSurveyDetails] = useState<Partial<Survey>>({});

  // Submissions Drawer
  const [responsesSurvey, setResponsesSurvey] = useState<Survey | null>(null);
  const [responsesData, setResponsesData] = useState<any[]>([]);
  const [responsesTotal, setResponsesTotal] = useState(0);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  // Analytics Drawer
  const [analyticsSurvey, setAnalyticsSurvey] = useState<Survey | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // New Survey Form State
  const [newSurveyId, setNewSurveyId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Water Quality");
  const [newType, setNewType] = useState<SurveyType>("STATIC");
  const [newDuration, setNewDuration] = useState(5);
  const [newCoins, setNewCoins] = useState(50);
  const [newQuota, setNewQuota] = useState(500);
  const [newAllowResume, setNewAllowResume] = useState(true);
  const [newAllowReview, setNewAllowReview] = useState(true);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Delete Survey Modal State
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Surveys
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

  // Filtered Surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const matchSearch =
        searchQuery === "" ||
        s.survey_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
      const matchType = typeFilter === "ALL" || s.survey_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [surveys, searchQuery, statusFilter, typeFilter]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const total = surveys.length;
    const published = surveys.filter((s) => s.status === "PUBLISHED").length;
    const completions = surveys.reduce((acc, s) => acc + (s.completions_count || 0), 0);
    const coinsIssued = surveys.reduce((acc, s) => acc + (s.completions_count || 0) * (s.reward_coins || 0), 0);
    return { total, published, completions, coinsIssued };
  }, [surveys]);

  // Create Survey Handler
  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setError("");

    try {
      const res = await fetch("/api/admin/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: newSurveyId.trim().toUpperCase(),
          title: newTitle.trim(),
          category: newCategory,
          surveyType: newType,
          estimatedDurationMin: Number(newDuration),
          rewardCoins: Number(newCoins),
          responseQuota: Number(newQuota),
          allowResume: newAllowResume,
          allowReview: newAllowReview,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create survey");

      setSuccess(`Survey ${newSurveyId} created successfully in DRAFT state.`);
      setIsCreateOpen(false);
      setNewSurveyId("");
      setNewTitle("");
      await fetchSurveys();

      // Automatically open builder for newly created survey
      if (data.survey) {
        handleOpenBuilder(data.survey);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Question & Branching Builder
  const handleOpenBuilder = async (survey: Survey) => {
    setBuilderSurvey(survey);
    setSurveyDetails({
      title: survey.title,
      description: survey.description || "",
      category: survey.category,
      survey_type: survey.survey_type,
      estimated_duration_min: survey.estimated_duration_min,
      reward_coins: survey.reward_coins,
      response_quota: survey.response_quota,
      allow_resume: survey.allow_resume,
      allow_review: survey.allow_review,
    });
    setBuilderTab("questions");
    setIsLoadingQuestions(true);

    try {
      const res = await fetch(`/api/admin/surveys/${survey.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const loadedQuestions = (data.survey.questions || []).map((q: any, idx: number) => ({
          id: q.id || `q-${idx + 1}`,
          orderNum: q.order_num || idx + 1,
          questionText: q.question_text || "",
          questionType: q.question_type || "SINGLE_CHOICE",
          description: q.description || "",
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) => (typeof opt === "string" ? opt : opt.label || opt.value || ""))
            : [],
          matrixRows: q.options?.matrixRows || ["Ease of Use", "Value for Money", "Customer Support"],
          matrixCols: q.options?.matrixCols || ["Poor", "Average", "Good", "Excellent"],
          isRequired: q.is_required !== false,
          validationRules: q.validation_rules || {},
          branchingRules: q.branching_rules || [],
          sectionName: q.section_name || "",
        }));

        setQuestions(loadedQuestions);
      }
    } catch (err: any) {
      setError("Failed to load questions: " + err.message);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Add Question to Form
  const handleAddQuestion = () => {
    const newId = `q-${Date.now()}`;
    setQuestions([
      ...questions,
      {
        id: newId,
        orderNum: questions.length + 1,
        questionText: "",
        questionType: "SINGLE_CHOICE",
        description: "",
        options: ["Option 1", "Option 2"],
        isRequired: true,
        validationRules: {},
        branchingRules: [],
      },
    ]);
  };

  // Move Question
  const handleMoveQuestion = (idx: number, direction: "UP" | "DOWN") => {
    if (direction === "UP" && idx === 0) return;
    if (direction === "DOWN" && idx === questions.length - 1) return;

    const targetIdx = direction === "UP" ? idx - 1 : idx + 1;
    const reordered = [...questions];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    setQuestions(reordered.map((q, i) => ({ ...q, orderNum: i + 1 })));
  };

  // Remove Question
  const handleRemoveQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderNum: i + 1 }));
    setQuestions(updated);
  };

  // Save Questions and Survey Details
  const handleSaveSurvey = async () => {
    if (!builderSurvey) return;
    setIsSavingQuestions(true);
    setError("");

    try {
      // 1. Update questions
      const payloadQuestions = questions.map((q) => {
        let formattedOptions: any = q.options;
        if (q.questionType === "MATRIX") {
          formattedOptions = {
            matrixRows: q.matrixRows || [],
            matrixCols: q.matrixCols || [],
          };
        }

        return {
          id: q.id,
          orderNum: q.orderNum,
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          description: q.description?.trim() || null,
          options: formattedOptions,
          isRequired: q.isRequired,
          validationRules: q.validationRules,
          branchingRules: q.branchingRules,
          sectionName: q.sectionName || null,
        };
      });

      const resQ = await fetch(`/api/admin/surveys/${builderSurvey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: payloadQuestions }),
      });
      const dataQ = await resQ.json();
      if (!resQ.ok || !dataQ.success) throw new Error(dataQ.error || "Failed to save questions");

      // 2. Update details
      const resD = await fetch(`/api/admin/surveys/${builderSurvey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: {
            title: surveyDetails.title,
            description: surveyDetails.description,
            category: surveyDetails.category,
            surveyType: surveyDetails.survey_type,
            estimatedDurationMin: surveyDetails.estimated_duration_min,
            rewardCoins: surveyDetails.reward_coins,
            responseQuota: surveyDetails.response_quota,
            allowResume: surveyDetails.allow_resume,
            allowReview: surveyDetails.allow_review,
          },
        }),
      });
      const dataD = await resD.json();
      if (!resD.ok || !dataD.success) throw new Error(dataD.error || "Failed to update details");

      setSuccess("Survey definition and settings saved successfully.");
      await fetchSurveys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // Validate and Publish Survey
  const preflightValidation = useMemo(() => {
    const engineQuestions = questions.map((q) => ({
      id: q.id,
      orderNum: q.orderNum,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.questionType === "MATRIX" ? { matrixRows: q.matrixRows, matrixCols: q.matrixCols } : q.options,
      isRequired: q.isRequired,
      validationRules: q.validationRules,
      branchingRules: q.branchingRules,
    }));

    return validateSurveyDefinition(engineQuestions as any, surveyDetails.survey_type || "STATIC");
  }, [questions, surveyDetails.survey_type]);

  const handlePublishSurvey = async () => {
    if (!builderSurvey) return;
    if (!preflightValidation.isValid) {
      setError("Cannot publish survey. Please fix preflight validation errors first.");
      return;
    }

    setIsSavingQuestions(true);
    setError("");

    try {
      // First save latest questions & details
      await handleSaveSurvey();

      // Then transition status to PUBLISHED
      const res = await fetch(`/api/admin/surveys/${builderSurvey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to publish survey");

      setSuccess(`Survey ${builderSurvey.survey_id} is now PUBLISHED and live for users.`);
      setBuilderSurvey(null);
      await fetchSurveys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // State Transition
  const handleTransitionState = async (surveyId: string, nextState: string) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Transition failed");
      setSuccess(`Survey status transitioned to ${nextState}.`);
      await fetchSurveys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Quick Pause / Resume Toggle
  const handleTogglePause = async (survey: Survey) => {
    const nextState = survey.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED";
    await handleTransitionState(survey.id, nextState);
  };

  // Delete Survey
  const handleDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/surveys/${surveyToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete survey");
      setSuccess(`Survey "${surveyToDelete.title}" (${surveyToDelete.survey_id}) deleted successfully.`);
      setSurveyToDelete(null);
      await fetchSurveys();
    } catch (err: any) {
      setError(err.message || "Failed to delete survey");
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate Survey
  const handleDuplicateSurvey = async (surveyId: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Duplicate failed");
      setSuccess(`Survey duplicated as ${data.duplicatedSurvey.survey_id} in DRAFT state.`);
      await fetchSurveys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Responses Drawer
  const handleOpenResponses = async (survey: Survey) => {
    setResponsesSurvey(survey);
    setIsLoadingResponses(true);
    setResponsesData([]);
    try {
      const res = await fetch(`/api/admin/surveys/${survey.id}/responses?limit=50`);
      const data = await res.json();
      if (res.ok && data.success) {
        setResponsesData(data.responses || []);
        setResponsesTotal(data.totalCount || 0);
      }
    } catch (err: any) {
      setError("Failed to load survey responses: " + err.message);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  // Open Analytics Drawer
  const handleOpenAnalytics = async (survey: Survey) => {
    setAnalyticsSurvey(survey);
    setIsLoadingAnalytics(true);
    setAnalyticsData(null);
    try {
      const res = await fetch(`/api/admin/surveys/${survey.id}/analytics`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyticsData(data.analytics);
      }
    } catch (err: any) {
      setError("Failed to load survey analytics: " + err.message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy tracking-tight">
            Surveys & Form Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative research surveys, dynamic decision branching, response quotas, and coin incentives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Survey</span>
          </button>
          <button
            onClick={() => fetchSurveys()}
            className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Surveys</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Active Published</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{metrics.published}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Total Responses</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{metrics.completions}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Coins Distributed</div>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">+{metrics.coinsIssued.toLocaleString()}</div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between animate-in fade-in duration-150">
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
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, title, or category..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
          >
            <option value="ALL">All Survey Types</option>
            <option value="STATIC">Static Questionnaire</option>
            <option value="DECISION_BASED">Decision-Based Branching</option>
          </select>
        </div>
      </div>

      {/* Surveys Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Survey & Type</th>
                <th className="px-5 py-3.5">Title & Category</th>
                <th className="px-5 py-3.5">Questions</th>
                <th className="px-5 py-3.5">Reward</th>
                <th className="px-5 py-3.5">Progress / Quota</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading surveys from database...</span>
                  </td>
                </tr>
              ) : filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No surveys found matching your query.
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((s) => {
                  const quotaPercent = Math.min(
                    100,
                    Math.round(((s.completions_count || 0) / (s.response_quota || 1)) * 100)
                  );

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-mono font-bold text-slate-900">{s.survey_id}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-sans">v{s.version}</span>
                          <span className="text-slate-300">·</span>
                          {s.survey_type === "DECISION_BASED" ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                              <GitBranch className="w-2.5 h-2.5" />
                              <span>Branch</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              Static
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900 max-w-xs">{s.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {s.category} · ~{s.estimated_duration_min}m
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-800">{s.questions_count}</span>
                        <span className="text-slate-400 ml-1">questions</span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-amber-600">
                        +{s.reward_coins} Coins
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-900">{s.completions_count}</span>
                          <span className="text-slate-400">/ {s.response_quota}</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-orange h-full rounded-full"
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>
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
                          {/* 1. Edit / Builder Button */}
                          <button
                            onClick={() => handleOpenBuilder(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-[11px] shadow-xs transition-colors"
                            title="Edit questions, logic, and settings"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {/* 2. Pause / Resume / Publish Quick Action */}
                          {s.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleTogglePause(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-[11px] transition-colors"
                              title="Pause survey from collecting new responses"
                            >
                              <Pause className="w-3 h-3" />
                              <span>Pause</span>
                            </button>
                          ) : s.status === "PAUSED" ? (
                            <button
                              onClick={() => handleTogglePause(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors"
                              title="Resume survey and allow users to participate"
                            >
                              <Play className="w-3 h-3" />
                              <span>Resume</span>
                            </button>
                          ) : s.status === "DRAFT" ? (
                            <button
                              onClick={() => handleTransitionState(s.id, "PUBLISHED")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors"
                              title="Publish survey"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Publish</span>
                            </button>
                          ) : (
                            (NEXT_STATES[s.status] || []).map((target) => (
                              <button
                                key={target}
                                onClick={() => handleTransitionState(s.id, target)}
                                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] transition-colors uppercase tracking-wider"
                              >
                                {target === "PUBLISHED" ? "Publish" : target}
                              </button>
                            ))
                          )}

                          {/* 3. Delete Action */}
                          <button
                            onClick={() => setSurveyToDelete(s)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium text-[11px] transition-colors"
                            title="Delete survey permanently"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>

                          <div className="h-4 w-px bg-slate-200 mx-0.5" />

                          {/* 4. Secondary Actions */}
                          {/* Responses Button */}
                          <button
                            onClick={() => handleOpenResponses(s)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                            title="View submitted responses"
                          >
                            Responses ({s.completions_count})
                          </button>

                          {/* Analytics Button */}
                          <button
                            onClick={() => handleOpenAnalytics(s)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="View Question Analytics"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Export CSV */}
                          <a
                            href={`/api/admin/surveys/${s.id}/export`}
                            download
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Export Responses to CSV"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </a>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateSurvey(s.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Duplicate survey"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SURVEY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">Create New Survey</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSurvey} className="space-y-4">
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
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Survey Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("STATIC")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newType === "STATIC"
                        ? "border-brand-orange bg-brand-orange/5 text-brand-orange"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Static Questionnaire</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Fixed linear question flow</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType("DECISION_BASED")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newType === "DECISION_BASED"
                        ? "border-brand-orange bg-brand-orange/5 text-brand-orange"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Decision-Based</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Dynamic branching & skips</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Survey Title (Public Facing)
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
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmittingCreate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create & Launch Builder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SURVEY CONFIRMATION MODAL */}
      {surveyToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Survey</h3>
                <p className="text-xs text-slate-500">This action will remove the survey definition.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Survey:</span>
                <span className="text-slate-900 font-semibold truncate max-w-[220px]">{surveyToDelete.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Identifier:</span>
                <span className="font-mono text-slate-900 font-medium">{surveyToDelete.survey_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_BADGES[surveyToDelete.status] || "bg-slate-100 text-slate-700"}`}>
                  {surveyToDelete.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Responses Collected:</span>
                <span className="text-slate-900 font-semibold">{surveyToDelete.completions_count}</span>
              </div>
            </div>

            <p className="text-xs text-red-600 mb-5 bg-red-50/60 p-2.5 rounded-lg border border-red-100">
              Are you sure you want to delete this survey? Its configured questions, branch logic, and survey structure will be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSurveyToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSurvey}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Survey</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION & BRANCHING BUILDER DRAWER */}
      {builderSurvey && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-brand-navy px-2 py-0.5 rounded bg-white border border-slate-200">
                    {builderSurvey.survey_id}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    v{builderSurvey.version}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      STATUS_BADGES[builderSurvey.status] || "bg-slate-100"
                    }`}
                  >
                    {builderSurvey.status}
                  </span>
                </div>
                <h2 className="font-bold text-sm text-slate-900 mt-1">{surveyDetails.title}</h2>
              </div>

              <button
                onClick={() => setBuilderSurvey(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5">
              <button
                onClick={() => setBuilderTab("questions")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  builderTab === "questions"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Questions ({questions.length})</span>
              </button>

              <button
                onClick={() => setBuilderTab("logic")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  builderTab === "logic"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Branching & Logic</span>
              </button>

              <button
                onClick={() => setBuilderTab("settings")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  builderTab === "settings"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Settings & Quota</span>
              </button>

              <button
                onClick={() => setBuilderTab("publish")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  builderTab === "publish"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Pre-flight & Publish</span>
                {!preflightValidation.isValid && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {isLoadingQuestions ? (
                <div className="py-24 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading survey definition...
                </div>
              ) : builderTab === "questions" ? (
                /* TAB 1: QUESTIONS */
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-xs text-slate-400">
                      No questions configured. Click &ldquo;Add Question&rdquo; to begin questionnaire design.
                    </div>
                  ) : (
                    questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 transition-all"
                      >
                        {/* Question Header & Order Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold font-mono text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">ID: {q.id}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, "UP")}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded hover:bg-slate-100"
                              title="Move question up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, "DOWN")}
                              disabled={idx === questions.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded hover:bg-slate-100"
                              title="Move question down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-2">
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
                              <span className="font-semibold text-slate-700">Required</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Question Text
                          </label>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].questionText = e.target.value;
                              setQuestions(updated);
                            }}
                            placeholder="e.g. What is the current TDS level of your tap water?"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                          />
                        </div>

                        {/* Description / Subtext */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Description / Help Text (Optional)
                          </label>
                          <input
                            type="text"
                            value={q.description}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].description = e.target.value;
                              setQuestions(updated);
                            }}
                            placeholder="e.g. Check your water report or municipal water bill if unsure"
                            className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-600"
                          />
                        </div>

                        {/* Question Type Selector */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Question Type
                            </label>
                            <select
                              value={q.questionType}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[idx].questionType = e.target.value as QuestionType;
                                setQuestions(updated);
                              }}
                              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                            >
                              {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Section Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={q.sectionName || ""}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[idx].sectionName = e.target.value;
                                setQuestions(updated);
                              }}
                              placeholder="e.g. Water Hardness Assessment"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                            />
                          </div>
                        </div>

                        {/* OPTIONS EDITOR (For Single Choice, Multiple Choice, Dropdown) */}
                        {["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(q.questionType) && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Answer Options ({q.options.length})
                            </label>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="text-slate-400 font-mono text-[10px] w-4">
                                    {optIdx + 1}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const updated = [...questions];
                                      updated[idx].options[optIdx] = e.target.value;
                                      setQuestions(updated);
                                    }}
                                    placeholder={`Option ${optIdx + 1}`}
                                    className="flex-1 h-8 px-2.5 rounded border border-slate-200 text-xs bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...questions];
                                      updated[idx].options = updated[idx].options.filter((_, i) => i !== optIdx);
                                      setQuestions(updated);
                                    }}
                                    disabled={q.options.length <= 1}
                                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                                    title="Delete option"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...questions];
                                updated[idx].options.push(`Option ${updated[idx].options.length + 1}`);
                                setQuestions(updated);
                              }}
                              className="text-xs font-semibold text-brand-orange hover:text-brand-orange-600 flex items-center gap-1 pt-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Option</span>
                            </button>
                          </div>
                        )}

                        {/* MATRIX EDITOR (Rows & Columns) */}
                        {q.questionType === "MATRIX" && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Matrix Rows (Sub-questions)
                                </label>
                                <textarea
                                  value={(q.matrixRows || []).join("\n")}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    updated[idx].matrixRows = e.target.value.split("\n").filter(Boolean);
                                    setQuestions(updated);
                                  }}
                                  rows={3}
                                  placeholder="One row per line..."
                                  className="w-full p-2 rounded border border-slate-200 text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Matrix Columns (Scale Options)
                                </label>
                                <textarea
                                  value={(q.matrixCols || []).join("\n")}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    updated[idx].matrixCols = e.target.value.split("\n").filter(Boolean);
                                    setQuestions(updated);
                                  }}
                                  rows={3}
                                  placeholder="One column per line..."
                                  className="w-full p-2 rounded border border-slate-200 text-xs bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* NUMERIC / RATING VALIDATION */}
                        {["NUMBER", "RATING_SCALE"].includes(q.questionType) && (
                          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <label className="block text-[10px] text-slate-500 font-semibold uppercase mb-1">
                                Minimum Value
                              </label>
                              <input
                                type="number"
                                value={q.validationRules?.min ?? (q.questionType === "RATING_SCALE" ? 1 : 0)}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[idx].validationRules = {
                                    ...updated[idx].validationRules,
                                    min: Number(e.target.value),
                                  };
                                  setQuestions(updated);
                                }}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 font-semibold uppercase mb-1">
                                Maximum Value
                              </label>
                              <input
                                type="number"
                                value={q.validationRules?.max ?? (q.questionType === "RATING_SCALE" ? 10 : 1000)}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[idx].validationRules = {
                                    ...updated[idx].validationRules,
                                    max: Number(e.target.value),
                                  };
                                  setQuestions(updated);
                                }}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 bg-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Question</span>
                  </button>
                </div>
              ) : builderTab === "logic" ? (
                /* TAB 2: BRANCHING & DECISION LOGIC */
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-start gap-2.5">
                    <GitBranch className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Decision Branching Engine:</span> Define conditional routing, skips, and early disqualifications. When a user answers a question, matching rules redirect their path or screen them out.
                    </div>
                  </div>

                  {questions.map((q, idx) => {
                    const rules = q.branchingRules || [];

                    return (
                      <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-xs text-slate-900">
                              Q{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate max-w-sm">
                              {q.questionText || "(Empty question text)"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...questions];
                              if (!updated[idx].branchingRules) updated[idx].branchingRules = [];
                              updated[idx].branchingRules!.push({
                                conditions: [{ questionId: q.id, operator: "EQUALS", value: "" }],
                                matchType: "ALL",
                                action: "SKIP_TO_QUESTION",
                                targetQuestionId: questions[idx + 1]?.id || "",
                              });
                              setQuestions(updated);
                            }}
                            className="text-xs font-semibold text-brand-orange hover:text-brand-orange-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Rule</span>
                          </button>
                        </div>

                        {rules.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">
                            Default: Proceeds to next question sequentially.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {rules.map((rule, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] text-slate-700">
                                    Rule #{rIdx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...questions];
                                      updated[idx].branchingRules = updated[idx].branchingRules!.filter(
                                        (_, i) => i !== rIdx
                                      );
                                      setQuestions(updated);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded"
                                    title="Delete rule"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Condition */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                                      Operator
                                    </label>
                                    <select
                                      value={rule.conditions[0]?.operator || "EQUALS"}
                                      onChange={(e) => {
                                        const updated = [...questions];
                                        updated[idx].branchingRules![rIdx].conditions[0].operator = e.target.value as Operator;
                                        setQuestions(updated);
                                      }}
                                      className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                                    >
                                      {OPERATORS.map((op) => (
                                        <option key={op.value} value={op.value}>
                                          {op.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                                      Answer Value
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.conditions[0]?.value ?? ""}
                                      onChange={(e) => {
                                        const updated = [...questions];
                                        updated[idx].branchingRules![rIdx].conditions[0].value = e.target.value;
                                        setQuestions(updated);
                                      }}
                                      placeholder="Value to match..."
                                      className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                                      Action
                                    </label>
                                    <select
                                      value={rule.action}
                                      onChange={(e) => {
                                        const updated = [...questions];
                                        updated[idx].branchingRules![rIdx].action = e.target.value as BranchAction;
                                        setQuestions(updated);
                                      }}
                                      className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                                    >
                                      <option value="SKIP_TO_QUESTION">Skip to Question</option>
                                      <option value="END_SURVEY">End Survey (Success)</option>
                                      <option value="DISQUALIFY">Disqualify (Screen Out)</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Target Question or Disqualification Reason */}
                                {rule.action === "SKIP_TO_QUESTION" && (
                                  <div>
                                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                                      Destination Question
                                    </label>
                                    <select
                                      value={rule.targetQuestionId || ""}
                                      onChange={(e) => {
                                        const updated = [...questions];
                                        updated[idx].branchingRules![rIdx].targetQuestionId = e.target.value;
                                        setQuestions(updated);
                                      }}
                                      className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                                    >
                                      <option value="">Select Target Question...</option>
                                      {questions
                                        .filter((_, targetIdx) => targetIdx !== idx)
                                        .map((targetQ, targetIdx) => (
                                          <option key={targetQ.id} value={targetQ.id}>
                                            Q{targetIdx + 1}: {targetQ.questionText || targetQ.id}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                )}

                                {rule.action === "DISQUALIFY" && (
                                  <div>
                                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                                      Disqualification Reason
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.disqualificationReason || ""}
                                      onChange={(e) => {
                                        const updated = [...questions];
                                        updated[idx].branchingRules![rIdx].disqualificationReason = e.target.value;
                                        setQuestions(updated);
                                      }}
                                      placeholder="e.g. This study is limited to homes with RO purifiers."
                                      className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : builderTab === "settings" ? (
                /* TAB 3: SETTINGS & METADATA */
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Survey Title
                      </label>
                      <input
                        type="text"
                        value={surveyDetails.title || ""}
                        onChange={(e) => setSurveyDetails({ ...surveyDetails, title: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={surveyDetails.category || ""}
                        onChange={(e) => setSurveyDetails({ ...surveyDetails, category: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description (Public Facing)
                    </label>
                    <textarea
                      value={surveyDetails.description || ""}
                      onChange={(e) => setSurveyDetails({ ...surveyDetails, description: e.target.value })}
                      rows={2}
                      className="w-full p-3 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        value={surveyDetails.estimated_duration_min ?? 5}
                        onChange={(e) =>
                          setSurveyDetails({ ...surveyDetails, estimated_duration_min: Number(e.target.value) })
                        }
                        min={1}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reward Coins
                      </label>
                      <input
                        type="number"
                        value={surveyDetails.reward_coins ?? 50}
                        onChange={(e) =>
                          setSurveyDetails({ ...surveyDetails, reward_coins: Number(e.target.value) })
                        }
                        min={0}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Response Quota Cap
                      </label>
                      <input
                        type="number"
                        value={surveyDetails.response_quota ?? 500}
                        onChange={(e) =>
                          setSurveyDetails({ ...surveyDetails, response_quota: Number(e.target.value) })
                        }
                        min={1}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={surveyDetails.allow_resume !== false}
                        onChange={(e) =>
                          setSurveyDetails({ ...surveyDetails, allow_resume: e.target.checked })
                        }
                        className="rounded text-brand-orange focus:ring-brand-orange"
                      />
                      <span>Allow Respondent Resume & Autosave</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={surveyDetails.allow_review !== false}
                        onChange={(e) =>
                          setSurveyDetails({ ...surveyDetails, allow_review: e.target.checked })
                        }
                        className="rounded text-brand-orange focus:ring-brand-orange"
                      />
                      <span>Enable Answer Review Mode Before Submit</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* TAB 4: PRE-FLIGHT CHECK & PUBLISH */
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="font-bold text-sm text-slate-900">
                        Pre-Flight Validation Engine
                      </h3>
                      {preflightValidation.isValid ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                          <span>Validation Passed: Ready to Publish</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span>Errors Detected: Cannot Publish</span>
                        </div>
                      )}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        {questions.length > 0 ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span>Survey has questions ({questions.length} defined)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {questions.every((q) => q.questionText.trim().length > 0) ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span>All questions have question text</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {questions.every(
                          (q) =>
                            !["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(q.questionType) ||
                            q.options.length >= 2
                        ) ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span>Choice questions contain at least two options</span>
                      </div>
                    </div>

                    {/* Preflight Errors List */}
                    {preflightValidation.errors.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 space-y-1">
                        <div className="font-bold">Required Fixes:</div>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {preflightValidation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Preflight Warnings List */}
                    {preflightValidation.warnings.length > 0 && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700 space-y-1">
                        <div className="font-bold">Advisory Warnings:</div>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {preflightValidation.warnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Publish Action Card */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900">
                        Publish Survey & Increment Version
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Publishing creates an immutable snapshot in <code>survey_versions</code>. Any active respondent will safely answer against this snapshot.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePublishSurvey}
                      disabled={!preflightValidation.isValid || isSavingQuestions}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                    >
                      {isSavingQuestions ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCheck className="w-4 h-4" />
                      )}
                      <span>Publish Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBuilderSurvey(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close Builder
              </button>

              <button
                type="button"
                onClick={handleSaveSurvey}
                disabled={isSavingQuestions}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
              >
                {isSavingQuestions ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSES VIEWER DRAWER */}
      {responsesSurvey && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Responses: {responsesSurvey.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {responsesSurvey.survey_id} · Total Submissions: {responsesTotal}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/admin/surveys/${responsesSurvey.id}/export`}
                  download
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
                <button
                  onClick={() => setResponsesSurvey(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {isLoadingResponses ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading respondent submissions...
                </div>
              ) : responsesData.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  No responses recorded yet for this survey.
                </div>
              ) : (
                responsesData.map((resp) => {
                  const isExpanded = expandedResponseId === resp.id;

                  return (
                    <div
                      key={resp.id}
                      className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedResponseId(isExpanded ? null : resp.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-xs text-slate-900">
                              {resp.customer_readable_id || "Customer"}
                            </span>
                            <span className="text-[11px] text-slate-400">({resp.phone_number})</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                STATUS_BADGES[resp.status] || "bg-slate-100"
                              }`}
                            >
                              {resp.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Started: {new Date(resp.created_at).toLocaleString()}
                            {resp.completed_at && ` · Completed: ${new Date(resp.completed_at).toLocaleTimeString()}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {resp.reward_issued && (
                            <span className="font-mono text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              +Coins Issued
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Answers Table */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs space-y-2">
                          <div className="font-semibold text-slate-700">Submitted Answers:</div>
                          {Object.keys(resp.answers || {}).length === 0 ? (
                            <div className="text-slate-400 italic">No answers saved yet.</div>
                          ) : (
                            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                              {Object.entries(resp.answers).map(([key, val]) => (
                                <div key={key} className="p-2.5 flex items-start justify-between gap-4">
                                  <span className="font-mono text-slate-600 text-[11px] shrink-0">{key}</span>
                                  <span className="font-medium text-slate-900 text-right text-[11px] break-all">
                                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setResponsesSurvey(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS DRAWER */}
      {analyticsSurvey && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Analytics: {analyticsSurvey.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {analyticsSurvey.survey_id} · Question Level Metrics
                </p>
              </div>

              <button
                onClick={() => setAnalyticsSurvey(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoadingAnalytics ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  Aggregating survey analytics...
                </div>
              ) : !analyticsData ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No analytics data available.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Responses</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                        {analyticsData.summary?.total_responses || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Completion Rate</div>
                      <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                        {analyticsData.summary?.completion_rate || 0}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg Completion Time</div>
                      <div className="text-lg font-bold text-blue-700 font-mono mt-0.5">
                        {analyticsData.summary?.avg_completion_time_min || 0}m
                      </div>
                    </div>
                  </div>

                  {/* Question Breakdowns */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Question Response Breakdowns
                    </h4>

                    {(analyticsData.questions || []).map((q: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-slate-800">
                            Q{q.order_num}: {q.question_text}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 bg-slate-100 rounded">
                            {q.question_type}
                          </span>
                        </div>

                        {/* Breakdown Display */}
                        {q.distribution && Object.keys(q.distribution).length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            {Object.entries(q.distribution).map(([opt, count]: [string, any]) => {
                              const totalQ = q.response_count || 1;
                              const pct = Math.round((Number(count) / totalQ) * 100);

                              return (
                                <div key={opt} className="text-xs">
                                  <div className="flex justify-between text-[11px] mb-0.5">
                                    <span className="text-slate-700 font-medium">{opt}</span>
                                    <span className="text-slate-400 font-mono">{count} ({pct}%)</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-brand-orange rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : q.average !== undefined ? (
                          <div className="text-xs font-mono text-slate-700">
                            Average Score: <span className="font-bold text-slate-900">{q.average}</span> (from {q.response_count} ratings)
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            {q.response_count || 0} responses recorded.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setAnalyticsSurvey(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}