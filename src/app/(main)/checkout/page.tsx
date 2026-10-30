import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { listAvailableVouchers } from "@/lib/voucher-db";
import { CheckoutClientView } from "./checkout-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await getCurrentSession();
  if (!session?.customerId) {
    redirect(`/auth?from=${encodeURIComponent("/checkout")}`);
  }

  const customer = await getCustomerById(session.customerId);
  const vouchers = await listAvailableVouchers(session.customerId);

  return (
    <CheckoutClientView
      customer={{
        id: session.customerId,
        fullName: customer?.full_name || "",
        displayName: customer?.display_name || "",
        phone: customer?.phone_e164 || session.phone || "",
        email: customer?.email || "",
        address: customer?.address || "",
        city: customer?.city || "",
        pincode: customer?.pincode || "",
        rewardCoins: customer?.reward_coins ?? 0,
      }}
      unlockedVouchers={vouchers.filter((v) => v.isUnlocked)}
    />
  );
}
