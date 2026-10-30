import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { listAvailableVouchers } from "@/lib/voucher-db";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const customerId = session?.customerId;
    const vouchers = await listAvailableVouchers(customerId);

    return NextResponse.json({ success: true, vouchers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
