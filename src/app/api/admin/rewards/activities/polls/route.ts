import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listQuickPollsAdmin, upsertQuickPollAdmin } from "@/lib/admin-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pollSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  question: z.string().min(5, "Question must be at least 5 characters"),
  pollType: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]).optional(),
  coinReward: z.number().int().min(1, "Coin reward must be at least 1"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  options: z.array(z.string().min(1)).min(2, "At least two options are required"),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "polls:read") && !hasAdminPermission(admin.role, "rewards:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const polls = await listQuickPollsAdmin();
    return NextResponse.json({ success: true, polls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load quick polls" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "polls:write") && !hasAdminPermission(admin.role, "rewards:write")) {
      return NextResponse.json({ error: "Insufficient permissions to manage polls" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = pollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const saved = await upsertQuickPollAdmin({ ...parsed.data, adminId: admin.adminId });
    return NextResponse.json({ success: true, poll: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save quick poll" }, { status: 500 });
  }
}
