import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listCustomersAdmin, logAdminAuditEvent } from "@/lib/admin-db";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "analytics:export")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: analytics:export permission required for CSV export" },
        { status: 403 }
      );
    }

    const { customers } = await listCustomersAdmin({ limit: 1000 });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_CUSTOMERS_EXPORTED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { recordCount: customers.length },
    });

    // Generate CSV (masking phone numbers partially for safe export)
    const headers = ["Customer ID", "Full Name", "City", "Phone (Masked)", "Onboarding Completed", "Status", "Reward Coins", "Registered At"];
    const rows = customers.map((c) => [
      `"${c.customer_id}"`,
      `"${(c.full_name || "").replace(/"/g, '""')}"`,
      `"${(c.city || "").replace(/"/g, '""')}"`,
      `"${c.phone_e164 ? c.phone_e164.slice(0, 5) + "XXXX" + c.phone_e164.slice(-2) : ""}"`,
      c.onboarding_completed ? "YES" : "NO",
      `"${c.status}"`,
      c.reward_coins || 0,
      `"${new Date(c.created_at).toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gharsure_customers_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
