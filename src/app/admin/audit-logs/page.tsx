"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface AuditEvent {
  id: string;
  event_type: string;
  actor_type: "ADMIN" | "CUSTOMER";
  phone_e164: string | null;
  ip_address: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  admin_email: string | null;
  admin_name: string | null;
  readable_customer_id: string | null;
  customer_name: string | null;
}

export default function AdminAuditLogsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (actorFilter !== "ALL") params.set("actorType", actorFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load audit events");
      setEvents(data.events);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [actorFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Security & Compliance Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, non-repudiable audit logs recording all administrative actions, data exports, and mutations.
          </p>
        </div>

        <button
          onClick={() => fetchEvents()}
          className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
          title="Refresh audit trail"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Filter Actor:
        </span>
        {["ALL", "ADMIN", "CUSTOMER"].map((act) => (
          <button
            key={act}
            onClick={() => setActorFilter(act)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              actorFilter === act
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Event Type</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Actor Details</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    No audit records matching filter criteria.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isExpanded = expandedId === ev.id;
                  return (
                    <React.Fragment key={ev.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 text-slate-400 font-sans">
                          {new Date(ev.created_at).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {ev.event_type}
                        </td>
                        <td className="px-5 py-3 font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ev.actor_type === "ADMIN"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {ev.actor_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-sans text-slate-700">
                          {ev.admin_email ? (
                            <span>{ev.admin_email}</span>
                          ) : ev.readable_customer_id ? (
                            <span>{ev.readable_customer_id} ({ev.phone_e164})</span>
                          ) : (
                            <span className="text-slate-400">{ev.phone_e164 || "System / Anon"}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">
                          {ev.ip_address || "internal"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {ev.metadata && Object.keys(ev.metadata).length > 0 ? (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-medium text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Payload</span>
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-300 font-sans text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && ev.metadata && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="px-8 py-3">
                            <pre className="text-[10px] font-mono text-slate-700 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                              {JSON.stringify(ev.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
