import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { MainAppShell } from "./main-app-shell";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  return (
    <MainAppShell customerName={customer?.display_name || customer?.full_name}>
      {children}
    </MainAppShell>
  );
}
