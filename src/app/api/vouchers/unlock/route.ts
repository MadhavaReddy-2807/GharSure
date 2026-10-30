import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { unlockVoucherWithCoins } from "@/lib/voucher-db";
import { z } from "zod";

const unlockSchema = z.object({
  voucherId: z.string().min(1, "Voucher ID or code is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please log in with your mobile number to unlock vouchers." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const result = await unlockVoucherWithCoins(session.customerId, parsed.data.voucherId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unlocked "${result.voucher?.title}"! You can now apply this discount at checkout.`,
      newBalance: result.newBalance,
      voucher: result.voucher,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to unlock voucher" },
      { status: 500 }
    );
  }
}
