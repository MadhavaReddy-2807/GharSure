import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listProductsAdmin } from "@/lib/admin-db";
import { StoreClientView } from "./store-client";

export const dynamic = "force-dynamic";

// High-resolution attractive curated dummy photos (Unsplash) matching Smytten & Home4U references
const dummyImages: Record<string, string> = {
  // Trail Kits (Image 2 style)
  trial_1: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80",
  trial_2: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
  trial_3: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80",
  trial_4: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80",
  trial_5: "https://images.unsplash.com/photo-1608248597359-2e11894a4087?w=500&auto=format&fit=crop&q=80",
  trial_6: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80",
  // Products
  prod_1: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&auto=format&fit=crop&q=80",
  prod_2: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80",
  prod_3: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&auto=format&fit=crop&q=80",
  prod_4: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80",
  prod_5: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=500&auto=format&fit=crop&q=80",
  prod_6: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80",
};

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

  // Inject attractive dummy images based on index and product type
  const enrichedProducts = products.map((p, idx) => {
    const isTrial = p.product_type === "TRIAL";
    const imgKey = isTrial
      ? `trial_${(idx % 6) + 1}`
      : `prod_${(idx % 6) + 1}`;
    return {
      ...p,
      image_url: dummyImages[imgKey] || dummyImages.prod_1,
      tag: isTrial ? (idx % 2 === 0 ? "Hot Picks" : "Trending Now") : (idx === 0 ? "New Launch" : "Best Seller"),
      size_label: isTrial ? `${(idx + 1) * 10} ml` : "1 Unit",
    };
  });

  // Pre-configured partner vouchers (Only 3 categories across store: Products, Trail Kits, Vouchers)
  const vouchers = [
    {
      id: "vouch-01",
      title: "50% Off Annual Appliance & Filter Maintenance",
      partner: "PureCare Network",
      code: "PURE50OFF",
      discount: "50% OFF",
      validity: "Valid for 30 days",
      terms: "Applicable on all comprehensive home maintenance services across certified technicians.",
      category: "Vouchers",
    },
    {
      id: "vouch-02",
      title: "Complimentary Doorstep Home Diagnostic Pass",
      partner: "GharSure Home Services",
      code: "FREEHOMEPASS",
      discount: "100% FREE",
      validity: "Valid for registered societies",
      terms: "Includes complete household inspection by a certified technician at zero charge.",
      category: "Vouchers",
    },
    {
      id: "vouch-03",
      title: "₹300 Off Whole-House Appliance Care Kit",
      partner: "GharSure Essentials",
      code: "GHARCARE300",
      discount: "₹300 FLAT",
      validity: "Instant redemption",
      terms: "Redeemable against any home appliance or kitchen care installation package.",
      category: "Vouchers",
    },
  ];

  return (
    <StoreClientView
      initialProducts={enrichedProducts}
      vouchers={vouchers}
      userCoins={userCoins}
      isLoggedIn={Boolean(session?.customerId)}
    />
  );
}
