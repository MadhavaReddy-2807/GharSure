import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { reviewFileSubmissionAdmin } from "@/lib/admin-db";
import { z } from "zod";

const reviewSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
  reviewerNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "files:review") && !hasAdminPermission(admin.role, "rewards:write")) {
      return NextResponse.json({ error: "Insufficient permissions to review document submissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const result = await reviewFileSubmissionAdmin({
      submissionId: parsed.data.submissionId,
      adminId: admin.adminId,
      decision: parsed.data.decision,
      rejectionReason: parsed.data.rejectionReason,
      reviewerNotes: parsed.data.reviewerNotes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Review failed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      decision: parsed.data.decision,
      coinsAwarded: result.coinsAwarded,
      message: parsed.data.decision === "APPROVE"
        ? `Submission approved! Credited +${result.coinsAwarded} GharSure coins to user.`
        : "Submission rejected with specified feedback.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Review failed" }, { status: 500 });
  }
}
