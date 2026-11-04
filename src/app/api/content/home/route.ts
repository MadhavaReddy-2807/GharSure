import { NextResponse } from "next/server";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listHomeBannersAdmin, listHomeSectionsAdmin } from "@/lib/admin-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let banners: any[] = [];
    let sections: any[] = [];

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const [bRows, sRows] = await Promise.all([
          sql`
            SELECT id, title, subtitle, desktop_image_url, mobile_image_url, link_url, display_order, status
            FROM home_banners 
            WHERE status = 'PUBLISHED' 
              AND (start_date IS NULL OR start_date <= NOW())
              AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY display_order ASC;
          `,
          sql`
            SELECT section_key, title, subtitle, is_visible, display_order, config 
            FROM home_sections 
            ORDER BY display_order ASC;
          `,
        ]);
        banners = bRows;
        sections = sRows;
      } catch (err) {
        console.warn("[API /api/content/home] DB fallback:", err);
      }
    }

    if (banners.length === 0) {
      banners = await listHomeBannersAdmin();
      banners = banners.filter((b) => b.status === "PUBLISHED");
    }
    if (sections.length === 0) {
      sections = await listHomeSectionsAdmin();
    }

    return NextResponse.json({
      success: true,
      banners,
      sections,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch home content" },
      { status: 500 }
    );
  }
}
