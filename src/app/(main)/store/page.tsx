import React from "react";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { StoreClientView } from "./store-client";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  let products: any[] = [];
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      products = await sql`
        SELECT id, title, summary, price_inr, brand, category, score, specifications, scorecard_details, evidence_sources
        FROM products
        WHERE status = 'PUBLISHED'
        ORDER BY score DESC NULLS LAST, created_at DESC;
      `;
    } catch (err) {
      console.warn("[Store] Could not load products from DB:", err);
      products = [];
    }
  }

  return <StoreClientView initialProducts={products} />;
}
