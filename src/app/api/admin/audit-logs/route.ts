import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listAuditEvents } from "@/lib/admin-db";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "audit:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: audit:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const eventType = searchParams.get("eventType") || undefined;
    const actorType = searchParams.get("actorType") || undefined;

    const data = await listAuditEvents({ limit, offset, eventType, actorType });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
