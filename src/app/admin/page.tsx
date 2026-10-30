import React from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  ClipboardList,
  Coins,
  PackageOpen,
  Headphones,
  ArrowRight,
  TrendingUp,
  History,
  Activity,
  Layers,
} from "lucide-react";
import { getDashboardMetrics } from "@/lib/admin-db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative platform metrics derived in real-time from Supabase PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Supabase Connected
          </span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.totalCustomers.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              +{metrics.newRegistrations7d} registered in last 7 days
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/admin/users"
              className="text-brand-orange hover:text-brand-orange-600 font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>Manage users</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Customers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.activeCustomers.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {metrics.totalCustomers > 0
                ? `${Math.round((metrics.activeCustomers / metrics.totalCustomers) * 100)}% onboarding conversion`
                : "Awaiting registrations"}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">Def: Onboarded & Active</span>
          </div>
        </div>

        {/* Survey Completions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Surveys</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.surveysCompleted.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              across {metrics.surveysPublished} active survey(s)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/admin/surveys"
              className="text-brand-orange hover:text-brand-orange-600 font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>Survey manager</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Reward Coins */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Coins Ledger</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.coinsIssued.toLocaleString()} <span className="text-xs font-normal text-slate-500">issued</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {metrics.coinsRedeemed.toLocaleString()} redeemed
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/admin/rewards"
              className="text-brand-orange hover:text-brand-orange-600 font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>Ledger & Rules</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Document Submissions Queue */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">
              {(metrics as any).pendingSubmissions ?? 0} Pending
            </div>
            <p className="text-[11px] text-slate-500">Document submissions to review</p>
          </div>
          <Link
            href="/admin/rewards"
            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"
          >
            Review Queue →
          </Link>
        </div>

        {/* Quick Poll Responses */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">
              {(metrics as any).pollResponses ?? 0} Votes
            </div>
            <p className="text-[11px] text-slate-500">Community poll responses</p>
          </div>
          <Link
            href="/admin/rewards"
            className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold"
          >
            Polls →
          </Link>
        </div>

        {/* Orders Placed */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">
              {(metrics as any).ordersPlaced ?? 0} Orders
            </div>
            <p className="text-[11px] text-slate-500">
              {(metrics as any).vouchersUnlocked ?? 0} vouchers unlocked
            </p>
          </div>
          <Link
            href="/admin/store"
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Store Catalog →
          </Link>
        </div>

        {/* Open Support Tickets */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">
              {metrics.openTickets} Open Tickets
            </div>
            <p className="text-[11px] text-slate-500">Customer assistance queue</p>
          </div>
          <Link
            href="/admin/support"
            className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold"
          >
            Support →
          </Link>
        </div>
      </div>

      {/* Recent Audit Activity Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Recent System & Administrative Activity
            </h2>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs text-brand-orange hover:text-brand-orange-600 font-medium inline-flex items-center gap-1"
          >
            <span>View full audit log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics.recentAuditEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No administrative events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Target / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {metrics.recentAuditEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-400 font-sans">
                      {new Date(event.created_at).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-slate-800">
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                          event.actor_type === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {event.actor_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-sans text-slate-500 max-w-xs truncate">
                      {event.phone_e164 ? `Phone: ${event.phone_e164}` : ""}
                      {event.metadata ? ` ${JSON.stringify(event.metadata)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
