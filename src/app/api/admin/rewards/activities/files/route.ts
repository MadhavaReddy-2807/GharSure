import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listFileActivitiesAdmin, listFileSubmissionsAdmin, upsertFileActivityAdmin } from "@/lib/admin-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const activitySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  instructions: z.string().optional(),
  documentType: z.string().min(1, "Document type is required"),
  acceptedFormats: z.array(z.string()).optional(),
  maxFileSizeBytes: z.number().positive().optional(),
  coinReward: z.number().int().min(1, "Coin reward must be at least 1"),
  approvalRequired: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "files:read") && !hasAdminPermission(admin.role, "rewards:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view"); // "activities" | "submissions"
    const status = searchParams.get("status") || "ALL";
    const activityId = searchParams.get("activityId") || "ALL";
    const search = searchParams.get("search") || "";

    if (view === "submissions") {
      const submissions = await listFileSubmissionsAdmin({ status, activityId, search });
      return NextResponse.json({ success: true, submissions });
    }

    const [activities, submissions] = await Promise.all([
      listFileActivitiesAdmin(),
      listFileSubmissionsAdmin({ status, activityId, search }),
    ]);

    return NextResponse.json({ success: true, activities, submissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load activities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "rewards:write") && !hasAdminPermission(admin.role, "access:manage")) {
      return NextResponse.json({ error: "Insufficient permissions to create/edit file activities" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = activitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const saved = await upsertFileActivityAdmin({ ...parsed.data, adminId: admin.adminId });
    return NextResponse.json({ success: true, activity: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save file activity" }, { status: 500 });
  }
}
