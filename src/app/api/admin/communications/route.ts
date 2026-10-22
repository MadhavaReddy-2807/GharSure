import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import {
  listNotificationCampaignsAdmin,
  createNotificationCampaignAdmin,
  executeNotificationSendAdmin,
  logAdminAuditEvent,
} from "@/lib/admin-db";
import { z } from "zod";

const campaignSchema = z.object({
  title: z.string().min(3),
  channel: z.enum(["WHATSAPP", "IN_APP", "SMS"]),
  templateName: z.string().min(2),
  bodyText: z.string().min(5),
  targetFilter: z.record(z.unknown()).optional(),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "communications:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: communications:read required" }, { status: 403 });
    }

    const campaigns = await listNotificationCampaignsAdmin();
    return NextResponse.json({ success: true, campaigns });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "communications:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: communications:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const campaign = await createNotificationCampaignAdmin({
      ...parsed.data,
      adminId: admin.adminId,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_COMMUNICATION_CAMPAIGN_CREATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { campaignId: campaign.id, title: campaign.title, channel: campaign.channel },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "communications:send")) {
      return NextResponse.json({ success: false, error: "Forbidden: communications:send required" }, { status: 403 });
    }

    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "campaignId is required" }, { status: 400 });
    }

    const updated = await executeNotificationSendAdmin(campaignId);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_COMMUNICATION_CAMPAIGN_SENT",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { campaignId, sentCount: updated.sent_count },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
