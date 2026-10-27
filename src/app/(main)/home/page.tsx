import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import { listProductsAdmin } from "@/lib/admin-db";
import {
  Droplets,
  Wrench,
  Gift,
  ArrowRight,
  ShieldCheck,
  Coins,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

export default async function HomePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const displayName = customer?.display_name || customer?.full_name?.split(" ")[0] || "Homeowner";
  const city = customer?.city || "India";
  const balance = customer?.reward_coins ?? 0;

  let activeTrialsCount = 0;
  let trendingProducts: any[] = [];
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      const res = await sql<{ count: string }[]>`
        SELECT count(*)::text as count FROM trial_campaigns WHERE status = 'ACTIVE'
      `;
      activeTrialsCount = parseInt(res[0]?.count || "0", 10);

      trendingProducts = await sql`
        SELECT id, title, price_inr, brand, category, score
        FROM products
        WHERE status = 'PUBLISHED'
        ORDER BY score DESC NULLS LAST
        LIMIT 3;
      `;
    } catch {
      activeTrialsCount = 1;
      trendingProducts = [];
    }
  }

  // Fallback products from store
  if (trendingProducts.length === 0) {
    const fallbackProducts = await listProductsAdmin();
    trendingProducts = fallbackProducts.slice(0, 3);
  }

  let featuredSurvey: any = null;
  if (session?.customerId) {
    try {
      const surveys = await listAvailableSurveysForCustomer(session.customerId);
      featuredSurvey = surveys.find((s) => s.userStatus === "IN_PROGRESS" || s.userStatus === "AVAILABLE");
    } catch {
      featuredSurvey = null;
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-5xl mx-auto">
      {/* Greeting Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified Homeowner</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">{city}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Household diagnostics, water reports, and service management.
          </p>
        </div>

        {/* Balance Badge */}
        <Link
          href="/rewards"
          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 px-3.5 py-2 rounded-lg self-start sm:self-center transition-colors group"
        >
          <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Reward Coins
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono leading-none group-hover:text-brand-purple transition-colors">
              {balance.toLocaleString()}
            </div>
          </div>
        </Link>
      </div>

      {/* Featured Survey Opportunity */}
      {featuredSurvey && (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-purple-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center shrink-0 border border-purple-100">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-50 text-brand-purple">
                  {featuredSurvey.category || "Research Survey"}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  +{featuredSurvey.rewardCoins} Coins
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                {featuredSurvey.title}
              </h2>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {featuredSurvey.description || "Help improve home care diagnostics and claim verified trial kits."}
              </p>
            </div>
          </div>

          <Link
            href={`/surveys/${featuredSurvey.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold transition-colors shrink-0"
          >
            <span>{featuredSurvey.userStatus === "IN_PROGRESS" ? "Resume Survey" : "Start Survey"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Household Services & Telemetry */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Household Diagnostics & Water Telemetry
          </h2>
          <span className="text-[11px] text-slate-400">Readings for {city}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Tile 1: Water Quality */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  TDS: Moderate
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Water Hardness Index
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Area municipal water averages 340-420 ppm. Semi-annual membrane descaling recommended for optimal water health.
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Society Telemetry</span>
              <Link href="/rewards" className="text-brand-purple font-semibold hover:underline">
                View Surveys
              </Link>
            </div>
          </div>

          {/* Tile 2: Trials & Store Redemptions */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Coin Redeemable
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Zero-Cost Trial Kits
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Redeem your earned GharSure Coins for verified rapid water test strips, organic descalers, and sample kits in the Store.
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Doorstep Delivery</span>
              <Link href="/store" className="text-brand-purple font-semibold hover:underline flex items-center gap-1">
                <span>Explore Store</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Products */}
      {trendingProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verified Store Products & Trial Kits
            </h2>
            <Link
              href="/store"
              className="text-xs font-semibold text-brand-purple hover:underline flex items-center gap-1"
            >
              <span>Explore Store</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {trendingProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {p.brand} · {p.category}
                    </span>
                    {p.score && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {Number(p.score).toFixed(1)}/5.0
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                    {p.title}
                  </h3>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                    ₹{Number(p.price_inr).toLocaleString("en-IN")}
                  </span>
                  <Link
                    href="/store"
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
