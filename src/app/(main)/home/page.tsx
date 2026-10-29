import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import { listProductsAdmin } from "@/lib/admin-db";
import {
  Droplets,
  Coins,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Package,
} from "lucide-react";

export default async function HomePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const displayName = customer?.display_name || customer?.full_name?.split(" ")[0] || "Homeowner";
  const city = customer?.city || "India";
  const balance = customer?.reward_coins ?? 0;

  let trendingProducts: any[] = [];

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      trendingProducts = await sql`
        SELECT id, title, price_inr, brand, category, score, product_type, coin_price
        FROM products
        WHERE status = 'PUBLISHED'
        ORDER BY is_featured DESC, score DESC NULLS LAST
        LIMIT 4;
      `;
    } catch {
      trendingProducts = [];
    }
  }

  if (trendingProducts.length === 0) {
    const fallbackProducts = await listProductsAdmin({ status: "PUBLISHED" });
    trendingProducts = fallbackProducts.slice(0, 4);
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
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-12">
      {/* 1. RESIDENT GREETING & BALANCE SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-medium text-slate-700">{city}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Homeowner</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {displayName}
          </h1>
        </div>

        {/* Clean Wallet Summary */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Reward Balance
            </div>
            <div className="text-base font-bold font-mono text-slate-900">
              {balance.toLocaleString()} <span className="text-xs font-normal text-slate-500">Coins</span>
            </div>
          </div>
          <Link
            href="/store"
            className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Redeem
          </Link>
        </div>
      </div>

      {/* 2. PRIORITY ACTION: ACTIVE SURVEY OPPORTUNITY */}
      {featuredSurvey && (
        <section aria-labelledby="active-survey-heading">
          <div className="p-4 sm:p-5 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {featuredSurvey.category || "Research Survey"}
                  </span>
                  <span className="text-xs font-mono font-semibold text-amber-700">
                    +{featuredSurvey.rewardCoins} Coins
                  </span>
                </div>
                <h2 id="active-survey-heading" className="text-sm sm:text-base font-semibold text-slate-900">
                  {featuredSurvey.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  {featuredSurvey.description || "Share household water details to earn instant reward coins."}
                </p>
              </div>
            </div>

            <Link
              href={`/surveys/${featuredSurvey.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-center"
            >
              <span>{featuredSurvey.userStatus === "IN_PROGRESS" ? "Resume" : "Start Survey"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* 3. WATER QUALITY & HOUSEHOLD TELEMETRY */}
      <section aria-labelledby="telemetry-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="telemetry-heading" className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Water Telemetry & Diagnostics
          </h2>
          <span className="text-xs text-slate-500">Calibrated for {city}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TDS Reading</div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">340 - 420 ppm</div>
            <p className="text-xs text-slate-500 mt-1">Standard municipal tap level. RO purification recommended.</p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Water Hardness</div>
            <div className="text-lg font-bold text-slate-900 mt-1">Moderate</div>
            <p className="text-xs text-slate-500 mt-1">Mineral scale on geysers manageable with citric descaling.</p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Purifier Maintenance</div>
            <div className="text-lg font-bold text-slate-900 mt-1">Filter Flush Due</div>
            <p className="text-xs text-slate-500 mt-1">Check sediment pre-filter cartridge status every 6 months.</p>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Need physical test strips delivered to verify tap water?</span>
          <Link href="/store" className="font-semibold text-brand-purple hover:underline flex items-center gap-1">
            <span>Claim Free Test Kit in Store</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </section>

      {/* 4. VERIFIED PRODUCTS & DOORSTEP TRIALS (Storefront Style) */}
      {trendingProducts.length > 0 && (
        <section aria-labelledby="storefront-heading" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 id="storefront-heading" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Storefront & Doorstep Trials
              </h2>
              <p className="text-xs text-slate-500">
                Verified water testing kits, IoT monitors, and OEM filter replacements
              </p>
            </div>
            <Link
              href="/store"
              className="text-xs font-semibold text-brand-purple hover:underline flex items-center gap-1"
            >
              <span>Explore All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingProducts.map((p) => {
              const isTrial = p.product_type === "TRIAL";
              const cost = p.coin_price ?? 0;
              const price = Number(p.price_inr) || 0;

              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    {/* Visual Placeholder container */}
                    <div className="h-32 rounded bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-400">
                      {isTrial ? (
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                          Doorstep Trial
                        </span>
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {p.brand} · {p.category}
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                      {p.title}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {isTrial ? (
                      <span className="text-xs font-bold font-mono text-amber-900">
                        {cost === 0 ? "0 Coins (Free)" : `${cost} Coins`}
                      </span>
                    ) : (
                      <span className="text-xs font-bold font-mono text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    )}

                    <Link
                      href="/store"
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                    >
                      {isTrial ? "Redeem" : "View"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. REFERRAL ENTRY POINT */}
      <section className="p-4 sm:p-5 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
            Invite Apartment Society Residents
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Earn +100 reward coins for each verified household in your society node.
          </p>
        </div>

        <Link
          href="/refer"
          className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors shrink-0"
        >
          <span>Refer & Win</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
}
