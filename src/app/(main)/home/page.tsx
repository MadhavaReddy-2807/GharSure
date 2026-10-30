import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import { listProductsAdmin } from "@/lib/admin-db";
import {
  Coins,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Package,
  Sparkles,
  Home,
  CheckCircle2,
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

  // Curated attractive photos matching Smytten / Home4U
  const dummyImages: Record<number, string> = {
    0: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80",
    1: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
    2: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&auto=format&fit=crop&q=80",
    3: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80",
  };

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
            <span className="font-semibold text-slate-700">{city}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Homeowner</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
        </div>

        {/* Clean Wallet Summary with Friendly Blue Button */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Reward Balance
            </div>
            <div className="text-base font-bold font-mono text-slate-900">
              {balance.toLocaleString()} <span className="text-xs font-normal text-slate-500">Coins</span>
            </div>
          </div>
          <Link
            href="/store"
            className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Explore Store
          </Link>
        </div>
      </div>

      {/* 2. PRIORITY ACTION: ACTIVE RESEARCH SURVEY */}
      {featuredSurvey && (
        <section aria-labelledby="active-survey-heading">
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                    {featuredSurvey.category || "Research Survey"}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{featuredSurvey.rewardCoins} Coins
                  </span>
                </div>
                <h2 id="active-survey-heading" className="text-sm sm:text-base font-bold text-slate-900">
                  {featuredSurvey.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  {featuredSurvey.description || "Share household feedback to earn instant reward coins for Trail Kits."}
                </p>
              </div>
            </div>

            <Link
              href={`/surveys/${featuredSurvey.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors shrink-0 self-start sm:self-center shadow-xs"
            >
              <span>{featuredSurvey.userStatus === "IN_PROGRESS" ? "Resume Survey" : "Start Survey"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* 3. HOUSEHOLD OVERVIEW & PREVENTIVE CARE */}
      <section aria-labelledby="household-overview-heading" className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <h2 id="household-overview-heading" className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Household Care & Service Status
          </h2>
          <span className="text-xs text-slate-500">{city} Node</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doorstep Trials</div>
            <div className="text-base font-bold text-slate-900">Free Kits Available</div>
            <p className="text-xs text-slate-500">Redeem trial packs for home care with 0 coins in the Store.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preventive Care</div>
            <div className="text-base font-bold text-emerald-700">All Systems Normal</div>
            <p className="text-xs text-slate-500">Appliance descaling and periodic inspection on schedule.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Community Referrals</div>
            <div className="text-base font-bold text-blue-700">+100 Coins per Neighbor</div>
            <p className="text-xs text-slate-500">Invite apartment residents to unlock collective benefits.</p>
          </div>
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS & TRAIL KITS (Matching Image 2 Smytten Card Aesthetic) */}
      {trendingProducts.length > 0 && (
        <section aria-labelledby="featured-products-heading" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 id="featured-products-heading" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Featured Products & Minis
              </h2>
              <p className="text-xs text-slate-500">
                Explore popular household essentials and zero-cost doorstep trial kits
              </p>
            </div>
            <Link
              href="/store"
              className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {trendingProducts.map((p, idx) => {
              const isTrial = p.product_type === "TRIAL";
              const cost = p.coin_price ?? 0;
              const price = Number(p.price_inr) || 0;
              const imgUrl = dummyImages[idx] || dummyImages[0];

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div>
                    {/* Image Container with Badges */}
                    <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
                      <img
                        src={imgUrl}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 z-10 text-[9px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded shadow-2xs uppercase">
                        {isTrial ? "★ Mini Trial" : "★ Hot Pick"}
                      </span>
                    </div>

                    <div className="p-3 space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {p.brand}
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                        {p.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    {isTrial ? (
                      <span className="text-xs font-bold font-mono text-amber-900">
                        {cost === 0 ? "0 Coins" : `${cost} Coins`}
                      </span>
                    ) : (
                      <span className="text-xs font-bold font-mono text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    )}

                    {/* Friendly Blue Button (Image 2 style) */}
                    <Link
                      href="/store"
                      className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      {isTrial ? "Try +" : "Add +"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. REFERRAL ENTRY POINT */}
      <section className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
            Invite Apartment Society Neighbors
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Earn +100 reward coins for each verified household in your apartment network.
          </p>
        </div>

        <Link
          href="/refer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shrink-0 shadow-xs"
        >
          <span>Refer & Win</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
}
