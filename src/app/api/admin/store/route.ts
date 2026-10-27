import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import {
  listProductsAdmin,
  saveProductAdmin,
  deleteProductAdmin,
  logAdminAuditEvent,
} from "@/lib/admin-db";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Title must be at least 2 characters").max(255),
  category: z.string().min(1, "Category is required").max(100),
  brand: z.string().min(1, "Brand is required").max(100),
  summary: z.string().default(""),
  productType: z.enum(["GHARSURE_PRODUCT", "TRIAL", "GENERAL_PRODUCT"]).default("GENERAL_PRODUCT"),
  priceInr: z.coerce.number().min(0).default(0),
  coinPrice: z.coerce.number().int().min(0).default(0),
  inventoryStock: z.coerce.number().int().min(0).default(100),
  isFeatured: z.boolean().default(false),
  score: z.coerce.number().min(0).max(10).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  specifications: z.record(z.any()).optional().default({}),
  scorecardDetails: z.record(z.any()).optional().default({}),
  evidenceSources: z.array(z.any()).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "store:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: store:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || searchParams.get("productType") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // Fetch products
    const products = await listProductsAdmin({
      productType: section,
      status,
      search,
    });

    // Also fetch all products for metrics breakdown
    const allProducts = await listProductsAdmin();
    const metrics = {
      total: allProducts.length,
      gharsureCount: allProducts.filter((p) => p.product_type === "GHARSURE_PRODUCT").length,
      trialCount: allProducts.filter((p) => p.product_type === "TRIAL").length,
      generalCount: allProducts.filter((p) => p.product_type === "GENERAL_PRODUCT" || !p.product_type).length,
      publishedCount: allProducts.filter((p) => p.status === "PUBLISHED").length,
    };

    return NextResponse.json({
      success: true,
      products,
      metrics,
      // Backwards compatibility for any legacy callers expecting 'trials'
      trials: products.filter((p) => p.product_type === "TRIAL"),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "store:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: store:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const product = await saveProductAdmin(parsed.data);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: parsed.data.id ? "ADMIN_PRODUCT_UPDATED" : "ADMIN_PRODUCT_CREATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: {
        productId: product.id,
        title: product.title,
        productType: product.product_type,
        status: product.status,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "store:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: store:write required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // body may not be JSON
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    await deleteProductAdmin(id);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_PRODUCT_DELETED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { productId: id },
    });

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
