import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { deleteQuickPollAdmin } from "@/lib/admin-db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "polls:write") && !hasAdminPermission(admin.role, "rewards:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    await deleteQuickPollAdmin(id, admin.adminId);
    return NextResponse.json({ success: true, message: "Poll deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete poll" }, { status: 500 });
  }
}
