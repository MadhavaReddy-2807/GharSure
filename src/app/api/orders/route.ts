import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { listCustomerOrders } from "@/lib/order-db";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orders = await listCustomerOrders(session.customerId);
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
