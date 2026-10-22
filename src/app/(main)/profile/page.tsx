import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { ProfileClientView } from "./profile-client";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const fullName = customer?.full_name || "Madhava Reddy";
  const phone = customer?.phone_e164 || "+91 98765 43210";
  const city = customer?.city || "Bangalore";

  return (
    <ProfileClientView
      fullName={fullName}
      phone={phone}
      city={city}
    />
  );
}
