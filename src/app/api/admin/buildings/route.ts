import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import {
  listBuildingsAdmin,
  saveBuildingAdmin,
  listObservationsAdmin,
  moderateObservationAdmin,
  logAdminAuditEvent,
} from "@/lib/admin-db";
import { z } from "zod";

const buildingSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3),
  pincode: z.string().min(6).max(10),
  city: z.string().min(2),
  locality: z.string().min(2),
  totalUnits: z.number().int().optional(),
  waterSource: z.string().optional(),
  avgTds: z.number().int().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "buildings:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: buildings:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "observations") {
      const observations = await listObservationsAdmin();
      return NextResponse.json({ success: true, observations });
    }

    const buildings = await listBuildingsAdmin();
    return NextResponse.json({ success: true, buildings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "buildings:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: buildings:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = buildingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const building = await saveBuildingAdmin(parsed.data);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: parsed.data.id ? "ADMIN_BUILDING_UPDATED" : "ADMIN_BUILDING_CREATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { buildingId: building.id, name: building.name, pincode: building.pincode },
    });

    return NextResponse.json({ success: true, building });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "buildings:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: buildings:write required" }, { status: 403 });
    }

    const body = await req.json();
    const { observationId, status, rejectionReason } = body;

    if (!observationId || !status) {
      return NextResponse.json({ success: false, error: "observationId and status are required" }, { status: 400 });
    }

    const updated = await moderateObservationAdmin(observationId, status, rejectionReason);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_OBSERVATION_MODERATED",
      adminId: admin.adminId,
      ipAddress: ip,
      metadata: { observationId, status, rejectionReason },
    });

    return NextResponse.json({ success: true, observation: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
