import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { ProfileClientView } from "./profile-client";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const fullName = customer?.full_name || customer?.display_name || "Resident";
  const phone = customer?.phone_e164 || session?.phone || "";
  const city = customer?.city || "Location not set";
  const coins = customer?.reward_coins ?? 0;

  return (
    <ProfileClientView
      fullName={fullName}
      phone={phone}
      city={city}
      coins={coins}
    />
  );
}
