import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { getSurveyAnalyticsAdmin } from "@/lib/admin-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "surveys:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: surveys:read required" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const analytics = await getSurveyAnalyticsAdmin(id, { status, startDate, endDate });

    return NextResponse.json({ success: true, analytics });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
