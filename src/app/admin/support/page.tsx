"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Headphones,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Clock,
  X,
  MessageSquare,
} from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  readable_customer_id: string;
  customer_name: string | null;
  phone_e164: string;
  subject: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assigned_to_name: string | null;
  notes: Array<{ text: string; by: string; at: string }>;
  created_at: string;
  updated_at: string;
}

const PRIORITY_BADGES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_BADGES: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Ticket Detail Drawer
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load support requests");
      setTickets(data.tickets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateTicket = async (statusOverride?: string, priorityOverride?: string) => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          subject: selectedTicket.subject,
          category: selectedTicket.category,
          priority: priorityOverride || selectedTicket.priority,
          status: statusOverride || selectedTicket.status,
          note: newNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Update failed");

      setSuccess("Ticket updated successfully.");
      setNewNote("");
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Support Desk & Moderation Tickets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resolve consumer inquiries, water report clarification, and trial fulfillment support.
          </p>
        </div>

        <button
          onClick={() => fetchTickets()}
          className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
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

      {/* Tickets Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Ticket #</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Subject & Category</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading support tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No support tickets found in database.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">
                      {t.ticket_number}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900 font-mono">{t.readable_customer_id}</div>
                      <div className="text-[11px] text-slate-400">{t.customer_name || t.phone_e164}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{t.subject}</div>
                      <div className="text-[11px] text-slate-400">{t.category}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          PRIORITY_BADGES[t.priority] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_BADGES[t.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Management Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  Ticket #{selectedTicket.ticket_number}
                </h2>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedTicket.readable_customer_id} ({selectedTicket.phone_e164})
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Subject</span>
                <p className="text-xs font-semibold text-slate-900">{selectedTicket.subject}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Category: <strong className="text-slate-800">{selectedTicket.category}</strong></span>
                </div>
              </div>

              {/* Status and Priority Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Status
                  </label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, status: e.target.value as any })}
                    className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Priority
                  </label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, priority: e.target.value as any })}
                    className="w-full h-8 px-2 rounded border border-slate-200 text-xs bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              {/* Internal Notes Thread */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-800 block">Administrative Note Thread</span>
                {selectedTicket.notes?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTicket.notes.map((n, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700">{n.by}</span>
                          <span>{new Date(n.at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800">{n.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No notes added yet.</p>
                )}

                <div className="pt-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    placeholder="Add an internal note or resolution summary..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTicket()}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
