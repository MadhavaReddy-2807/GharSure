import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listProductsAdmin, saveProductAdmin, logAdminAuditEvent } from "@/lib/admin-db";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  category: z.string().min(2),
  brand: z.string().min(2),
  summary: z.string().default(""),
  specifications: z.record(z.unknown()).default({}),
  priceInr: z.number().min(0),
  score: z.number().min(0).max(10).nullable().optional(),
  scorecardDetails: z.record(z.unknown()).optional(),
  evidenceSources: z.array(z.unknown()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "content:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: content:read required" }, { status: 403 });
    }

    const products = await listProductsAdmin();
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "content:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: content:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (parsed.data.status === "PUBLISHED" && !hasAdminPermission(admin.role, "content:publish")) {
      return NextResponse.json({ success: false, error: "Forbidden: content:publish permission required" }, { status: 403 });
    }

    const product = await saveProductAdmin(parsed.data);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: parsed.data.id ? "ADMIN_PRODUCT_UPDATED" : "ADMIN_PRODUCT_CREATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { productId: product.id, title: product.title, score: product.score },
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
