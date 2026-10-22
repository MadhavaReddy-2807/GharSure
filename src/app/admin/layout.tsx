import React from "react";
import { getCurrentAdminSession, ROLE_PERMISSIONS } from "@/lib/admin-auth";
import { AdminLayoutShell } from "./admin-layout-shell";

export const metadata = {
  title: "GharSure Admin Console",
  description: "Administrative control portal for GharSure platform operations",
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdminSession();

  // If unauthenticated (e.g. on /admin/login), render children directly without shell
  if (!admin) {
    return <>{children}</>;
  }

  const permissions = ROLE_PERMISSIONS[admin.role] || [];

  return (
    <AdminLayoutShell
      admin={{
        adminId: admin.adminId,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      }}
      permissions={permissions}
    >
      {children}
    </AdminLayoutShell>
  );
}
