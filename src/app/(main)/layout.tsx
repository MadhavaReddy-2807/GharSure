import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Application Header */}
      <AppHeader
        customerId={customer?.customer_id || session?.readableId}
        fullName={customer?.display_name || customer?.full_name}
      />

      {/* Main Content Area with bottom padding for mobile navigation bar */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4 pb-24 md:pb-16 flex flex-col">
        {children}
      </main>

      {/* Persistent Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
