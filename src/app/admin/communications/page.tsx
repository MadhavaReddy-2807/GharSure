"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BellRing,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  MessageSquare,
  Smartphone,
  X,
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  channel: "WHATSAPP" | "IN_APP" | "SMS";
  template_name: string;
  body_text: string;
  status: "DRAFT" | "SENT" | "SCHEDULED" | "FAILED";
  sent_count: number;
  created_at: string;
}

export default function AdminCommunicationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "IN_APP" | "SMS">("WHATSAPP");
  const [templateName, setTemplateName] = useState("survey_invite_v1");
  const [bodyText, setBodyText] = useState("Namaste {{fullName}}! A new water quality audit survey is available for your neighborhood. Earn 50 GharSure coins now.");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/communications");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load campaigns");
      setCampaigns(data.campaigns);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          channel,
          templateName,
          bodyText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save campaign");

      setSuccess(`Campaign "${title}" created successfully.`);
      setIsModalOpen(false);
      setTitle("");
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendCampaign = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Trigger immediate broadcast of "${title}" to active audience?`
    );
    if (!confirmed) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/admin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Send failed");

      setSuccess(`Campaign sent successfully to ${data.campaign.sent_count} verified subscribers.`);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Customer Communications & Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compliant WhatsApp notification campaigns, survey invitations, and in-app alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Notification Campaign</span>
          </button>
          <button
            onClick={() => fetchCampaigns()}
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

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Campaign</th>
                <th className="px-5 py-3.5">Channel</th>
                <th className="px-5 py-3.5">Template</th>
                <th className="px-5 py-3.5">Message Preview</th>
                <th className="px-5 py-3.5">Delivered</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading notification campaigns...</span>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No communication campaigns created yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {c.title}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        {c.channel === "WHATSAPP" ? (
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{c.channel}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">
                      {c.template_name}
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-xs truncate">
                      {c.body_text}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-slate-800">
                      {c.sent_count} recipients
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.status === "DRAFT" && (
                        <button
                          onClick={() => handleSendCampaign(c.id, c.title)}
                          disabled={isSending}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Broadcast</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">
                  New Communication Template
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Whitefield Tap TDS Alert & Survey"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="WHATSAPP">WhatsApp (Meta Cloud API)</option>
                    <option value="IN_APP">In-App Banner</option>
                    <option value="SMS">SMS Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Identifier
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. water_alert_v1"
                    required
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Body
                </label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={3}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-sans leading-relaxed focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              {/* Message Preview Bubble */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800">WhatsApp Bubble Preview</span>
                <p className="text-xs text-slate-800 leading-snug bg-white p-2.5 rounded-lg border border-emerald-200/60 shadow-2xs">
                  {bodyText.replace("{{fullName}}", "Rahul")}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Campaign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
