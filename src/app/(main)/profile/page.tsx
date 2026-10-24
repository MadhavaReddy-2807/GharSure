import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { ProfileClientView } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const fullName = customer?.full_name || customer?.display_name || "Resident";
  const phone = customer?.phone_e164 || session?.phone || "";
  const city = customer?.city || "Location not set";
  const coins = customer?.reward_coins ?? 0;
  const customerId = customer?.customer_id || "GH000000";

  let surveysCompleted = 0;
  let referralsRewarded = 0;

  if (isDirectDatabaseConfigured() && customer) {
    try {
      const sql = getDirectSql();
      const [surveyStat] = await sql`
        SELECT count(*)::text as count FROM survey_responses 
        WHERE customer_id = ${customer.id} AND status = 'COMPLETED';
      `;
      surveysCompleted = parseInt(surveyStat?.count || "0", 10);

      const [refStat] = await sql`
        SELECT count(*)::text as count FROM referral_attributions
        WHERE referrer_id = ${customer.id} AND status = 'REWARDED';
      `;
      referralsRewarded = parseInt(refStat?.count || "0", 10);
    } catch {
      // Fallback
    }
  }

  return (
    <ProfileClientView
      fullName={fullName}
      phone={phone}
      city={city}
      coins={coins}
      customerId={customerId}
      surveysCompleted={surveysCompleted}
      referralsRewarded={referralsRewarded}
    />
  );
}
