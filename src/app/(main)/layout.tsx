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
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col antialiased">
      {/* Top Application Header */}
      <AppHeader
        fullName={customer?.display_name || customer?.full_name}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12 flex flex-col">
        {children}
      </main>

      {/* Persistent Bottom Navigation (mobile only, hidden on md+) */}
      <BottomNav />
    </div>
  );
}
