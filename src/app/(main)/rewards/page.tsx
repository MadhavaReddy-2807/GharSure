import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById, getCustomerByPhone } from "@/lib/supabase/db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import { listAvailableFileActivities, listAvailableQuickPolls } from "@/lib/rewards-activities-db";
import { RewardsClientView } from "./rewards-client";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const session = await getCurrentSession();
  let customer = session ? await getCustomerById(session.customerId) : null;
  if (!customer && session?.phone) {
    customer = await getCustomerByPhone(session.phone);
  }
  const balance = customer?.reward_coins ?? 0;
  const customerId = customer?.id || session?.customerId;

  const [surveys, fileActivities, quickPolls] = await Promise.all([
    customerId ? listAvailableSurveysForCustomer(customerId).catch(() => []) : [],
    listAvailableFileActivities(customerId).catch(() => []),
    listAvailableQuickPolls(customerId).catch(() => []),
  ]);

  return (
    <RewardsClientView
      initialSurveys={surveys}
      initialFileActivities={fileActivities}
      initialQuickPolls={quickPolls}
      initialCoins={balance}
      isLoggedIn={Boolean(customerId)}
    />
  );
}
