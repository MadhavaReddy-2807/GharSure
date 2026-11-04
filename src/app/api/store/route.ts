import { NextRequest, NextResponse } from "next/server";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listProductsAdmin } from "@/lib/admin-db";

export const dynamic = "force-dynamic";

// High-resolution curated photos matching website store standards
const dummyImages: Record<string, string> = {
  trial_1: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80",
  trial_2: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
  trial_3: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80",
  trial_4: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80",
  trial_5: "https://images.unsplash.com/photo-1608248597359-2e11894a4087?w=500&auto=format&fit=crop&q=80",
  trial_6: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80",
  prod_1: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&auto=format&fit=crop&q=80",
  prod_2: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80",
  prod_3: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&auto=format&fit=crop&q=80",
  prod_4: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80",
  prod_5: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=500&auto=format&fit=crop&q=80",
  prod_6: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let products: any[] = [];
    let variants: any[] = [];

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const [pRows, vRows] = await Promise.all([
          sql`
            SELECT 
              id, title, summary, price_inr, coin_price, brand, category, score,
              specifications, scorecard_details, evidence_sources, product_type,
              inventory_stock, is_featured, is_hot_pick, is_recommended, is_new_arrival,
              is_best_seller, discount_percent, display_order, image_url, status
            FROM products
            WHERE status = 'PUBLISHED'
            ORDER BY display_order ASC, is_featured DESC, is_hot_pick DESC, score DESC NULLS LAST, created_at DESC;
          `,
          sql`
            SELECT id, product_id, title, price_inr, coin_price, inventory_stock
            FROM product_variants;
          `,
        ]);
        products = pRows;
        variants = vRows;
      } catch (err) {
        console.warn("[API /api/store] DB query fallback:", err);
      }
    }

    if (products.length === 0) {
      products = await listProductsAdmin({ status: "PUBLISHED" });
    }

    // Group variants by product_id
    const variantsByProduct = new Map<string, any[]>();
    for (const v of variants) {
      const list = variantsByProduct.get(v.product_id) || [];
      list.push({
        id: v.id,
        name: v.title,
        price_inr: Number(v.price_inr),
        coin_price: Number(v.coin_price),
        inventory_stock: Number(v.inventory_stock),
      });
      variantsByProduct.set(v.product_id, list);
    }

    // Filter by category or search if provided
    let filtered = products;
    if (category && category !== "ALL") {
      const catLower = category.toLowerCase();
      if (catLower === "trail kits" || catLower === "trial") {
        filtered = filtered.filter((p) => p.product_type === "TRIAL" || p.category?.toLowerCase() === "trail kits");
      } else if (catLower === "products") {
        filtered = filtered.filter((p) => p.product_type !== "TRIAL");
      } else {
        filtered = filtered.filter(
          (p) =>
            p.category?.toLowerCase() === catLower ||
            p.product_type?.toLowerCase() === catLower
        );
      }
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(s) ||
          p.brand?.toLowerCase().includes(s) ||
          p.summary?.toLowerCase().includes(s)
      );
    }

    // Enrich products with clean image_url and clean specifications
    const enriched = filtered.map((p, idx) => {
      const isTrial = p.product_type === "TRIAL";
      const imgKey = isTrial ? `trial_${(idx % 6) + 1}` : `prod_${(idx % 6) + 1}`;
      const imageUrl = p.image_url || dummyImages[imgKey];

      let parsedSpecs: Record<string, any> = {};
      if (typeof p.specifications === "string") {
        try {
          parsedSpecs = JSON.parse(p.specifications);
        } catch {
          parsedSpecs = {};
        }
      } else if (p.specifications && typeof p.specifications === "object" && !Array.isArray(p.specifications)) {
        parsedSpecs = p.specifications;
      }

      const cleanSpecs: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsedSpecs)) {
        if (!/^\d+$/.test(k) && typeof v !== "object" && v !== null && v !== undefined && String(v).trim()) {
          cleanSpecs[k] = String(v);
        }
      }

      const productVariants = variantsByProduct.get(p.id) || [];

      return {
        id: p.id,
        title: p.title,
        brand: p.brand,
        category: p.category,
        summary: p.summary,
        price_inr: Number(p.price_inr ?? 0),
        priceInr: Number(p.price_inr ?? 0),
        coin_price: Number(p.coin_price ?? 0),
        coinPrice: Number(p.coin_price ?? 0),
        product_type: p.product_type ?? "GENERAL_PRODUCT",
        productType: p.product_type ?? "GENERAL_PRODUCT",
        inventory_stock: Number(p.inventory_stock ?? 10),
        inventoryStock: Number(p.inventory_stock ?? 10),
        is_featured: Boolean(p.is_featured),
        isFeatured: Boolean(p.is_featured),
        is_hot_pick: Boolean(p.is_hot_pick),
        isHotPick: Boolean(p.is_hot_pick),
        is_recommended: Boolean(p.is_recommended),
        isRecommended: Boolean(p.is_recommended),
        is_new_arrival: Boolean(p.is_new_arrival),
        isNewArrival: Boolean(p.is_new_arrival),
        is_best_seller: Boolean(p.is_best_seller),
        isBestSeller: Boolean(p.is_best_seller),
        discount_percent: Number(p.discount_percent ?? 0),
        discountPercent: Number(p.discount_percent ?? 0),
        display_order: Number(p.display_order ?? 0),
        displayOrder: Number(p.display_order ?? 0),
        score: p.score ? Number(p.score) : null,
        image_url: imageUrl,
        imageUrl: imageUrl,
        status: p.status || "PUBLISHED",
        specifications: cleanSpecs,
        variants: productVariants,
      };
    });

    return NextResponse.json({
      success: true,
      products: enriched,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
