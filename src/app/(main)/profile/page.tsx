import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { ProfileClientView } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  let customer = session ? await getCustomerById(session.customerId) : null;
  if (!customer && session?.phone) {
    const { getCustomerByPhone } = await import("@/lib/supabase/db");
    customer = await getCustomerByPhone(session.phone);
  }

  const fullName = customer?.full_name || customer?.display_name || "Resident";
  const phone = customer?.phone_e164 || session?.phone || "";
  const email = customer?.email || "";
  const address = customer?.address || "";
  const city = customer?.city || "Location not set";
  const pincode = customer?.pincode || "";
  const coins = customer?.reward_coins ?? 0;
  const customerId = customer?.customer_id || session?.readableId || "GH000001";

  let surveysCompleted = 0;
  let referralsRewarded = 0;
  let userPosts: any[] = [];

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

      userPosts = await sql`
        SELECT id, post_type, title, content, category, likes_count, replies_count, created_at, status
        FROM community_posts
        WHERE customer_id = ${customer.id}
        ORDER BY created_at DESC;
      `;
    } catch {
      // Fallback
      userPosts = [];
    }
  }

  return (
    <ProfileClientView
      fullName={fullName}
      phone={phone}
      email={email}
      address={address}
      city={city}
      pincode={pincode}
      coins={coins}
      customerId={customerId}
      surveysCompleted={surveysCompleted}
      referralsRewarded={referralsRewarded}
      initialUserPosts={userPosts}
    />
  );
}
