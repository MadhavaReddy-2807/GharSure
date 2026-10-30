import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { updateProductMerchandisingAdmin } from "@/lib/admin-db";
import { z } from "zod";

const merchandisingSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  isHotPick: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  displayOrder: z.number().int().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "STRUCK_OFF"]).optional(),
  highlightStartDate: z.string().nullable().optional(),
  highlightEndDate: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "store:write")) {
      return NextResponse.json({ error: "Insufficient permissions to manage merchandising" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = merchandisingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { productId, ...merchandising } = parsed.data;
    const updated = await updateProductMerchandisingAdmin(productId, merchandising, admin.adminId);

    return NextResponse.json({
      success: true,
      product: updated,
      message: "Merchandising controls updated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update merchandising" }, { status: 500 });
  }
}
