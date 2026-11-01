import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, verifyRequestSession } from "@/lib/session";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Fallback in-memory carts store
const inMemoryCustomerCarts = new Map<string, any[]>();

export async function GET(req: NextRequest) {
  try {
    const session = (await verifyRequestSession(req)) || (await getCurrentSession());
    if (!session?.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const rows = await sql`
          SELECT items, updated_at
          FROM customer_carts
          WHERE customer_id::text = ${session.customerId};
        `;
        const items = rows[0]?.items || [];
        return NextResponse.json({ success: true, items });
      } catch (err: any) {
        console.warn("[Cart API direct db fallback]", err.message);
      }
    }

    try {
      const supabase = getSupabaseServerClient() as any;
      const { data, error } = await supabase
        .from("customer_carts")
        .select("items")
        .eq("customer_id", session.customerId)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ success: true, items: data.items || [] });
      }
    } catch {
      // fallback
    }

    const items = inMemoryCustomerCarts.get(session.customerId) || [];
    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await verifyRequestSession(req)) || (await getCurrentSession());
    if (!session?.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body.items) ? body.items : [];

    // Sanitize and normalize items
    const items = rawItems.map((item: any) => ({
      lineId: item.lineId || `${item.productId || item.product?.id}_${item.variantId || "default"}`,
      product: item.product || {
        id: item.productId,
        title: item.title,
        price_inr: item.priceInr || item.price_inr,
        coin_price: item.coinPrice || item.coin_price,
        image_url: item.imageUrl || item.image_url,
        brand: item.brand || "GharSure",
        category: item.category || "Products",
      },
      variantId: item.variantId || null,
      variantName: item.variantName || null,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        await sql`
          INSERT INTO customer_carts (customer_id, items, updated_at)
          VALUES (${session.customerId}, ${JSON.stringify(items)}::jsonb, NOW())
          ON CONFLICT (customer_id)
          DO UPDATE SET items = EXCLUDED.items, updated_at = NOW();
        `;
        return NextResponse.json({ success: true, items });
      } catch (err: any) {
        console.warn("[Cart API direct db fallback]", err.message);
      }
    }

    try {
      const supabase = getSupabaseServerClient() as any;
      await supabase
        .from("customer_carts")
        .upsert({
          customer_id: session.customerId,
          items,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "customer_id" });

      return NextResponse.json({ success: true, items });
    } catch {
      // fallback
    }

    inMemoryCustomerCarts.set(session.customerId, items);
    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = (await verifyRequestSession(req)) || (await getCurrentSession());
    if (!session?.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        await sql`
          UPDATE customer_carts
          SET items = '[]'::jsonb, updated_at = NOW()
          WHERE customer_id::text = ${session.customerId};
        `;
        return NextResponse.json({ success: true, items: [] });
      } catch (err: any) {
        console.warn("[Cart API direct db fallback]", err.message);
      }
    }

    inMemoryCustomerCarts.set(session.customerId, []);
    return NextResponse.json({ success: true, items: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
