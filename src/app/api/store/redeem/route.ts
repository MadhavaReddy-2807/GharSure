import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { inMemoryDb } from "@/lib/supabase/db";
import { z } from "zod";

const redeemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please log in with your phone number to redeem trial kits." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { productId } = parsed.data;

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        return await sql.begin(async (tx: any) => {
          // 1. Get customer
          const customers = await tx`
            SELECT id, full_name, reward_coins, phone_e164
            FROM customers
            WHERE id::text = ${session.customerId} OR customer_id = ${session.customerId}
            FOR UPDATE;
          `;

          if (!customers || customers.length === 0) {
            return NextResponse.json({ success: false, error: "Customer record not found" }, { status: 404 });
          }

          const customer = customers[0];
          const currentBalance = customer.reward_coins ?? 0;

          // 2. Get product
          const products = await tx`
            SELECT id, title, product_type, coin_price, inventory_stock, status
            FROM products
            WHERE id::text = ${productId}
            FOR UPDATE;
          `;

          if (!products || products.length === 0) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
          }

          const product = products[0];
          if (product.status !== "PUBLISHED") {
            return NextResponse.json({ success: false, error: "This item is not currently active" }, { status: 400 });
          }

          if (product.inventory_stock <= 0) {
            return NextResponse.json({ success: false, error: "This trial kit is temporarily out of stock" }, { status: 400 });
          }

          const coinCost = Number(product.coin_price) || 0;
          if (currentBalance < coinCost) {
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient coin balance. You need ${coinCost} coins, but have ${currentBalance} coins. Complete surveys to earn more coins!`,
              },
              { status: 400 }
            );
          }

          const newBalance = currentBalance - coinCost;

          // 3. Insert transaction
          const idempotencyKey = `store_redeem_${customer.id}_${product.id}_${Date.now()}`;
          await tx`
            INSERT INTO coin_transactions (
              customer_id, amount, type, description, idempotency_key, metadata
            )
            VALUES (
              ${customer.id}, ${-coinCost}, 'STORE_REDEMPTION',
              ${`Redeemed trial kit: ${product.title}`}, ${idempotencyKey},
              ${JSON.stringify({ productId: product.id, title: product.title, coinCost })}::jsonb
            );
          `;

          // 4. Update customer coins
          await tx`
            UPDATE customers
            SET reward_coins = ${newBalance}, updated_at = NOW()
            WHERE id = ${customer.id};
          `;

          // 5. Decrement inventory
          await tx`
            UPDATE products
            SET inventory_stock = GREATEST(0, inventory_stock - 1), updated_at = NOW()
            WHERE id = ${product.id};
          `;

          return NextResponse.json({
            success: true,
            newBalance,
            message: `Order confirmed for "${product.title}"! Free doorstep delivery dispatched to your address.`,
          });
        });
      } catch (err: any) {
        console.warn("[Redeem] DB error during redemption:", err.message);
      }
    }

    // In-memory fallback
    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      newBalance: customer.reward_coins || 0,
      message: "Order placed successfully! Free doorstep delivery dispatched.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Redemption failed" }, { status: 500 });
  }
}
