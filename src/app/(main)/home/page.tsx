import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById, getCustomerByPhone } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import { listProductsAdmin, listHomeBannersAdmin, listHomeSectionsAdmin } from "@/lib/admin-db";
import { listAvailableQuickPolls } from "@/lib/rewards-activities-db";
import {
  Coins,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Vote,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();
  let customer = session ? await getCustomerById(session.customerId) : null;
  if (!customer && session?.phone) {
    customer = await getCustomerByPhone(session.phone);
  }

  const displayName = customer?.display_name || customer?.full_name?.split(" ")[0] || "Homeowner";
  const city = customer?.city || "India";
  const balance = customer?.reward_coins ?? 0;

  let trendingProducts: any[] = [];
  let banners: any[] = [];
  let sections: any[] = [];
  let quickPolls: any[] = [];

  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      [trendingProducts, banners, sections, quickPolls] = await Promise.all([
        sql`
          SELECT id, title, price_inr, brand, category, score, product_type, coin_price, image_url, is_hot_pick, is_featured
          FROM products
          WHERE status = 'PUBLISHED'
          ORDER BY is_hot_pick DESC, is_featured DESC, score DESC NULLS LAST
          LIMIT 4;
        `,
        sql`
          SELECT * FROM home_banners 
          WHERE status = 'PUBLISHED' 
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
          ORDER BY display_order ASC;
        `,
        sql`SELECT * FROM home_sections ORDER BY display_order ASC;`,
        listAvailableQuickPolls(customer?.id),
      ]);
    } catch (err) {
      console.warn("[Home] Error loading dynamic home content:", err);
    }
  }

  if (trendingProducts.length === 0) {
    const fallbackProducts = await listProductsAdmin({ status: "PUBLISHED" });
    trendingProducts = fallbackProducts.slice(0, 4);
  }
  if (banners.length === 0) {
    banners = await listHomeBannersAdmin();
  }
  if (sections.length === 0) {
    sections = await listHomeSectionsAdmin();
  }

  // Active survey if user logged in
  let featuredSurvey: any = null;
  if (customer?.id) {
    try {
      const surveys = await listAvailableSurveysForCustomer(customer.id);
      featuredSurvey = surveys.find((s) => s.userStatus === "IN_PROGRESS" || s.userStatus === "AVAILABLE");
    } catch {
      featuredSurvey = null;
    }
  }

  const activePoll = quickPolls.find((p) => !p.hasVoted) || quickPolls[0];
  const primaryBanner = banners[0] || null;

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      {/* 1. RESIDENT GREETING & BALANCE SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">{city}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Household</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
        </div>

        {/* Clean Wallet Summary with Blue Button */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Reward Balance
            </div>
            <div className="text-base font-bold font-mono text-slate-900 flex items-center justify-end gap-1">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{balance.toLocaleString()} Coins</span>
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

      {/* 2. ADMIN-CONTROLLED HERO PROMOTIONAL BANNER */}
      {primaryBanner && (
        <section aria-labelledby="hero-banner-heading" className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900">
          <div className="relative h-48 sm:h-64 w-full">
            <img
              src={primaryBanner.desktop_image_url}
              alt={primaryBanner.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-6 sm:p-8 flex flex-col justify-end">
              <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase bg-blue-950/80 px-2.5 py-1 rounded w-fit mb-2 border border-blue-800/60">
                GharSure Household Highlight
              </span>
              <h2 id="hero-banner-heading" className="text-lg sm:text-2xl font-bold text-white max-w-xl leading-tight">
                {primaryBanner.title}
              </h2>
              {primaryBanner.subtitle && (
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg line-clamp-2">
                  {primaryBanner.subtitle}
                </p>
              )}
              <div className="mt-4">
                <Link
                  href={primaryBanner.link_url || "/store"}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <span>Explore Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. PRIORITY ACTION: ACTIVE RESEARCH SURVEY */}
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

      {/* 4. QUICK POLL PREVIEW IF OPEN */}
      {activePoll && !activePoll.hasVoted && (
        <section aria-labelledby="home-poll-heading">
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                    Community Quick Poll
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    +{activePoll.coin_reward} Coins
                  </span>
                </div>
                <h2 id="home-poll-heading" className="text-sm sm:text-base font-bold text-slate-900">
                  {activePoll.question}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share your voice and earn instant reward coins in our Rewards hub.
                </p>
              </div>
            </div>

            <Link
              href="/rewards"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors shrink-0 self-start sm:self-center"
            >
              <span>Answer Poll</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* 5. CURATED STORE HIGHLIGHTS */}
      <section aria-labelledby="store-highlights-heading" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 id="store-highlights-heading" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Verified Household Solutions
            </h2>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Lab Calibrated
            </span>
          </div>

          <Link
            href="/store"
            className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {trendingProducts.map((p, idx) => (
            <Link
              key={p.id}
              href="/store"
              className="group block p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all hover:shadow-xs"
            >
              <div className="aspect-square rounded-lg bg-slate-100 overflow-hidden mb-2.5 relative border border-slate-100">
                <img
                  src={
                    p.image_url ||
                    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80"
                  }
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
                {p.is_hot_pick && (
                  <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider shadow-xs">
                    Hot Pick
                  </span>
                )}
              </div>

              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{p.brand}</div>
              <h3 className="text-xs font-semibold text-slate-900 line-clamp-1 group-hover:text-[#2563EB] transition-colors mt-0.5">
                {p.title}
              </h3>
              <div className="mt-2 text-xs font-bold text-slate-900">
                {p.product_type === "TRIAL" ? "Doorstep Free Trial" : `₹${Number(p.price_inr).toLocaleString()}`}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
