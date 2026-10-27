import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listProductsAdmin } from "@/lib/admin-db";
import { StoreClientView } from "./store-client";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const session = await getCurrentSession();
  let customer = session ? await getCustomerById(session.customerId) : null;
  if (!customer && session?.phone) {
    const { getCustomerByPhone } = await import("@/lib/supabase/db");
    customer = await getCustomerByPhone(session.phone);
  }
  const userCoins = customer?.reward_coins ?? 0;

  let products: any[] = [];
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      products = await sql`
        SELECT 
          id, title, summary, price_inr, coin_price, brand, category, score,
          specifications, scorecard_details, evidence_sources, product_type,
          inventory_stock, is_featured
        FROM products
        WHERE status = 'PUBLISHED'
        ORDER BY is_featured DESC, score DESC NULLS LAST, created_at DESC;
      `;
    } catch (err) {
      console.warn("[Store] Could not load products from DB, using fallback:", err);
      products = [];
    }
  }

  if (products.length === 0) {
    const all = await listProductsAdmin({ status: "PUBLISHED" });
    products = all;
  }

  return (
    <StoreClientView
      initialProducts={products}
      userCoins={userCoins}
      isLoggedIn={Boolean(session?.customerId)}
    />
  );
}
