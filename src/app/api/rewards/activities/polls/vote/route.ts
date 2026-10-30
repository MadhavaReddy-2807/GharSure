import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { submitQuickPollVote } from "@/lib/rewards-activities-db";
import { z } from "zod";

const voteSchema = z.object({
  pollId: z.string().min(1, "Poll ID is required"),
  selectedOptionIds: z.array(z.string().min(1)).min(1, "Select at least one option"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please log in to participate in quick polls." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid vote" },
        { status: 400 }
      );
    }

    const result = await submitQuickPollVote({
      pollId: parsed.data.pollId,
      customerId: session.customerId,
      selectedOptionIds: parsed.data.selectedOptionIds,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      coinsAwarded: result.coinsAwarded,
      newBalance: result.newBalance,
      message: `Vote registered! You earned +${result.coinsAwarded} GharSure Coins.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit vote" },
      { status: 500 }
    );
  }
}
