import { NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { getDirectSql } from "@/lib/supabase/direct-db";

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "analytics:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: analytics:read required" }, { status: 403 });
    }

    const sql = getDirectSql();

    // 1. Onboarding breakdown
    const onboardingStats = await sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE onboarding_completed = true)::int as completed,
        count(*) FILTER (WHERE onboarding_completed = false)::int as pending
      FROM customers;
    `;

    // 2. City breakdown
    const cityBreakdown = await sql`
      SELECT COALESCE(city, 'Unspecified') as city, count(*)::int as count
      FROM customers
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10;
    `;

    // 3. Survey statistics
    const surveyStats = await sql`
      SELECT s.title, s.survey_id, s.reward_coins,
             count(sr.id)::int as total_responses,
             count(sr.id) FILTER (WHERE sr.status = 'COMPLETED')::int as completed_responses
      FROM surveys s
      LEFT JOIN survey_responses sr ON s.id = sr.survey_id
      GROUP BY s.id, s.title, s.survey_id, s.reward_coins
      ORDER BY total_responses DESC;
    `;

    // 4. Rewards ledger breakdown by type
    const rewardsByType = await sql`
      SELECT type, count(*)::int as count, sum(amount)::int as total_amount
      FROM coin_transactions
      GROUP BY type
      ORDER BY count DESC;
    `;

    // 5. Daily registrations (last 14 days)
    const dailyRegistrations = await sql`
      SELECT DATE(created_at)::text as date, count(*)::int as count
      FROM customers
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC;
    `;

    return NextResponse.json({
      success: true,
      analytics: {
        onboarding: onboardingStats[0],
        cityBreakdown,
        surveyStats,
        rewardsByType,
        dailyRegistrations,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
