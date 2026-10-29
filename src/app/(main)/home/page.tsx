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
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Activity,
  Layers,
} from "lucide-react";

export default async function HomePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const displayName = customer?.display_name || customer?.full_name?.split(" ")[0] || "Homeowner";
  const city = customer?.city || "India";
  const balance = customer?.reward_coins ?? 0;

  let trendingProducts: any[] = [];
  let communityPosts: any[] = [];

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

      communityPosts = await sql`
        SELECT id, title, post_type, category, likes_count, replies_count, created_at
        FROM community_posts
        ORDER BY created_at DESC
        LIMIT 2;
      `;
    } catch {
      trendingProducts = [];
      communityPosts = [];
    }
  }

  // Fallback products from store
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
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-16">
      {/* 1. HERO GREETING BANNER */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-7 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Homeowner</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-xs text-slate-500 font-medium">{city} Society Node</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Live household water telemetry, research rewards, and verified doorstep service management.
          </p>
        </div>

        {/* Quick Balance & Action Card */}
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 border border-slate-200 p-3 sm:px-4 sm:py-3.5 rounded-xl self-start md:self-center shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-2xs">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
              Reward Coins
            </div>
            <div className="text-lg font-extrabold text-slate-900 font-mono leading-none">
              {balance.toLocaleString()}
            </div>
          </div>
          <Link
            href="/store"
            className="ml-2 px-3.5 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <span>Redeem</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN DESKTOP GRID (lg:grid-cols-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Telemetry, Active Survey, and Community (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Research Survey Card */}
          {featuredSurvey && (
            <div className="bg-gradient-to-r from-purple-50 via-white to-purple-50/30 rounded-2xl p-5 sm:p-6 border border-purple-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-brand-purple text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-brand-purple border border-purple-200">
                        {featuredSurvey.category || "Active Research Survey"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>+{featuredSurvey.rewardCoins} Coins</span>
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {featuredSurvey.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 max-w-xl">
                      {featuredSurvey.description || "Help calibrate neighborhood drinking water standards and earn instant coins for trial kits."}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/surveys/${featuredSurvey.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-center"
                >
                  <span>{featuredSurvey.userStatus === "IN_PROGRESS" ? "Resume Survey" : "Start Survey"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Household Water Telemetry & Hardness Index Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Water Hardness & Municipal Telemetry
                  </h3>
                  <p className="text-xs text-slate-400">Calibrated for {city} tap & borewell supplies</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                TDS: 340-420 ppm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Mineral Hardness</div>
                <div className="text-sm font-bold text-slate-800">Moderate to High</div>
                <p className="text-[11px] text-slate-500">Requires anti-scalant or inline citric conditioning</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Chlorine Level</div>
                <div className="text-sm font-bold text-emerald-700">0.4 - 0.7 ppm</div>
                <p className="text-[11px] text-slate-500">Within municipal safe disinfection margins</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">RO Membrane Health</div>
                <div className="text-sm font-bold text-blue-700">92% Rejection</div>
                <p className="text-[11px] text-slate-500">Semi-annual flush recommended in 45 days</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Need immediate testing strips at your home?</span>
              <Link
                href="/store"
                className="text-brand-purple font-semibold hover:underline flex items-center gap-1"
              >
                <span>Get Free Water Test Strips</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Community Q&A & Resident Insights */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-purple" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Apartment Society Water Discussions
                </h3>
              </div>
              <Link href="/profile" className="text-xs font-semibold text-brand-purple hover:underline">
                Ask Question
              </Link>
            </div>

            {communityPosts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {communityPosts.map((post) => (
                  <div key={post.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase text-brand-purple bg-purple-50 px-2 py-0.5 rounded">
                        {post.category || "General"}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                      {post.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">
                Have a question about your building's water quality or water purifier performance? Use the center (+) button or profile to post an inquiry.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Trial Card, Care Checklist, and Refer & Win (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Zero-Cost Trial Kit Spotlight */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                <Gift className="w-3 h-3 text-amber-700" />
                <span>Doorstep Trial</span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-900">0 Coins</span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Rapid Water Hardness & TDS Test Strips
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Order 5 calibrated test strips to measure calcium carbonate hardness and residual chlorine at zero monetary charge.
            </p>

            <Link
              href="/store"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Claim Free in Store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Household Water Health Checklist */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Preventive Care Checklist
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>RO Pre-Filter Spun Polypropylene replacement due in 30 days</span>
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Geyser heating coil citric descaling scheduled</span>
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>TDS meter battery check passed</span>
              </li>
            </ul>

            <Link
              href="/store"
              className="text-xs font-semibold text-brand-purple hover:underline block pt-2 border-t border-slate-100"
            >
              Browse Genuine Filters & Spares &rarr;
            </Link>
          </div>

          {/* Refer Neighbors Widget */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Users className="w-4 h-4 text-brand-purple" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Invite Society Neighbors
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Earn +100 bonus coins for every resident who verifies their apartment water diagnostics.
            </p>
            <Link
              href="/refer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all w-full justify-center"
            >
              <span>Open Refer & Earn</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. VERIFIED HARDWARE & PURIFIERS SHELF */}
      {trendingProducts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Recommended Water Diagnostics & Products
              </h2>
              <p className="text-xs text-slate-500">
                Verified hardware and trial kits available directly in the Store
              </p>
            </div>
            <Link
              href="/store"
              className="text-xs font-semibold text-brand-purple hover:underline flex items-center gap-1"
            >
              <span>Explore All Products</span>
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
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {p.brand} · {p.category}
                      </span>
                      {p.score && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {Number(p.score).toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-brand-purple transition-colors">
                      {p.title}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {isTrial ? (
                      <span className="text-xs sm:text-sm font-bold font-mono text-amber-900">
                        {cost === 0 ? "Free Trial" : `${cost} Coins`}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    )}

                    <Link
                      href="/store"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
