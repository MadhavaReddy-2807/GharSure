import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import {
  listHomeBannersAdmin,
  upsertHomeBannerAdmin,
  deleteHomeBannerAdmin,
  listHomeSectionsAdmin,
  updateHomeSectionAdmin,
} from "@/lib/admin-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bannerSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Title is required"),
  subtitle: z.string().optional(),
  desktopImageUrl: z.string().url("Valid image URL required"),
  mobileImageUrl: z.string().url("Valid mobile image URL required").optional(),
  linkUrl: z.string().optional(),
  displayOrder: z.number().int().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const sectionSchema = z.object({
  sectionKey: z.string().min(1, "Section key is required"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  isVisible: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  config: z.record(z.any()).optional(),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "content:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [banners, sections] = await Promise.all([
      listHomeBannersAdmin(),
      listHomeSectionsAdmin(),
    ]);

    return NextResponse.json({ success: true, banners, sections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load home content" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "content:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const type = body.type; // "banner" | "section"

    if (type === "section") {
      const parsed = sectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }
      const updated = await updateHomeSectionAdmin(parsed.data.sectionKey, parsed.data, admin.adminId);
      return NextResponse.json({ success: true, section: updated });
    } else {
      const parsed = bannerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }
      const saved = await upsertHomeBannerAdmin({ ...parsed.data, adminId: admin.adminId });
      return NextResponse.json({ success: true, banner: saved });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update home content" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(admin.role, "content:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const bannerId = searchParams.get("bannerId");
    if (!bannerId) {
      return NextResponse.json({ error: "Banner ID required" }, { status: 400 });
    }

    await deleteHomeBannerAdmin(bannerId);
    return NextResponse.json({ success: true, message: "Banner deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete banner" }, { status: 500 });
  }
}
