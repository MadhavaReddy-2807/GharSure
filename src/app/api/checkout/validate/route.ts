import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { validateVoucherForOrder } from "@/lib/voucher-db";
import { z } from "zod";

const validateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      quantity: z.number().int().positive(),
    })
  ),
  voucherCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const customerId = session?.customerId || "guest";

    const body = await req.json();
    const parsed = validateCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid cart payload" }, { status: 400 });
    }

    const { items, voucherCode } = parsed.data;
    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        subtotalInr: 0,
        discountInr: 0,
        totalInr: 0,
        totalCoins: 0,
        items: [],
      });
    }

    if (isDirectDatabaseConfigured()) {
      const sql = getDirectSql();
      const productIds = items.map((i) => i.productId);
      const dbProducts = await sql`
        SELECT id, title, brand, price_inr, coin_price, inventory_stock, status
        FROM products
        WHERE id::text = ANY(${productIds});
      `;

      const variantIds = items.filter((i) => i.variantId).map((i) => i.variantId!);
      let dbVariants: any[] = [];
      if (variantIds.length > 0) {
        dbVariants = await sql`
          SELECT id, product_id, title, price_inr, coin_price, inventory_stock
          FROM product_variants
          WHERE id::text = ANY(${variantIds});
        `;
      }

      const pMap = new Map(dbProducts.map((p: any) => [p.id, p]));
      const vMap = new Map(dbVariants.map((v: any) => [v.id, v]));

      let subtotalInr = 0;
      let totalCoins = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        const p: any = pMap.get(item.productId);
        if (!p) continue;

        let unitPrice = Number(p.price_inr) || 0;
        let unitCoins = Number(p.coin_price) || 0;
        let stock = Number(p.inventory_stock) || 0;
        let variantName: string | undefined = undefined;

        if (item.variantId) {
          const v: any = vMap.get(item.variantId);
          if (v) {
            if (v.price_inr !== null) unitPrice = Number(v.price_inr);
            if (v.coin_price !== null) unitCoins = Number(v.coin_price);
            stock = Number(v.inventory_stock);
            variantName = v.title;
          }
        }

        const linePrice = unitPrice * item.quantity;
        const lineCoins = unitCoins * item.quantity;

        subtotalInr += linePrice;
        totalCoins += lineCoins;

        verifiedItems.push({
          productId: p.id,
          title: p.title,
          brand: p.brand,
          variantId: item.variantId,
          variantName,
          quantity: item.quantity,
          unitPriceInr: unitPrice,
          unitCoins,
          linePriceInr: linePrice,
          lineCoins,
          inStock: stock >= item.quantity,
          availableStock: stock,
        });
      }

      let discountInr = 0;
      let voucherStatus: any = null;

      if (voucherCode && customerId !== "guest") {
        const vCheck = await validateVoucherForOrder(customerId, voucherCode, subtotalInr);
        if (vCheck.valid) {
          discountInr = vCheck.discountInr;
          voucherStatus = { valid: true, discountInr, code: vCheck.voucherCode };
        } else {
          voucherStatus = { valid: false, error: vCheck.error };
        }
      }

      const totalInr = Math.max(0, Math.round((subtotalInr - discountInr) * 100) / 100);

      return NextResponse.json({
        success: true,
        subtotalInr,
        discountInr,
        totalInr,
        totalCoins,
        items: verifiedItems,
        voucherStatus,
      });
    }

    return NextResponse.json({
      success: true,
      subtotalInr: 0,
      discountInr: 0,
      totalInr: 0,
      totalCoins: 0,
      items: [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
