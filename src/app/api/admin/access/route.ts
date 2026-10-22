import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission, hashAdminPassword, AdminRole } from "@/lib/admin-auth";
import {
  listAdmins,
  createAdminUser,
  updateAdminUser,
  getAdminByEmail,
  logAdminAuditEvent,
} from "@/lib/admin-db";
import { z } from "zod";

const createAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(100),
  password: z.string().min(8, "Temporary password must be at least 8 characters"),
  role: z.enum(["SUPER_ADMIN", "OPERATIONS_ADMIN", "CONTENT_MANAGER", "SUPPORT_ADMIN", "ANALYST"]),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "access:manage")) {
      return NextResponse.json({ success: false, error: "Forbidden: access:manage permission required" }, { status: 403 });
    }

    const admins = await listAdmins();
    return NextResponse.json({ success: true, admins });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await getCurrentAdminSession();
    if (!currentAdmin || !hasAdminPermission(currentAdmin.role, "access:manage")) {
      return NextResponse.json({ success: false, error: "Forbidden: access:manage permission required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { email, fullName, password, role } = parsed.data;

    // Check duplicate
    const existing = await getAdminByEmail(email);
    if (existing) {
      return NextResponse.json({ success: false, error: "An administrator with this email already exists" }, { status: 400 });
    }

    const passwordHash = hashAdminPassword(password);
    const newAdmin = await createAdminUser({
      email,
      fullName,
      passwordHash,
      role: role as AdminRole,
      invitedBy: currentAdmin.adminId,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_INVITED",
      adminId: currentAdmin.adminId,
      ipAddress: ip,
      metadata: { newAdminId: newAdmin.id, email: newAdmin.email, role: newAdmin.role },
    });

    return NextResponse.json({
      success: true,
      message: "Administrator created successfully",
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        fullName: newAdmin.full_name,
        role: newAdmin.role,
        status: newAdmin.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentAdmin = await getCurrentAdminSession();
    if (!currentAdmin || !hasAdminPermission(currentAdmin.role, "access:manage")) {
      return NextResponse.json({ success: false, error: "Forbidden: access:manage permission required" }, { status: 403 });
    }

    const body = await req.json();
    const { targetAdminId, role, status, fullName } = body;

    if (!targetAdminId) {
      return NextResponse.json({ success: false, error: "targetAdminId is required" }, { status: 400 });
    }

    // Protection 1: Admin cannot change their own role (prevent escalation or self-lockout)
    if (role && targetAdminId === currentAdmin.adminId) {
      return NextResponse.json(
        { success: false, error: "Security restriction: You cannot alter your own administrative role." },
        { status: 400 }
      );
    }

    const updated = await updateAdminUser(targetAdminId, {
      role: role as AdminRole | undefined,
      status: status as "ACTIVE" | "SUSPENDED" | undefined,
      fullName,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: "ADMIN_ROLE_OR_STATUS_UPDATED",
      adminId: currentAdmin.adminId,
      ipAddress: ip,
      metadata: { targetAdminId, role, status },
    });

    return NextResponse.json({
      success: true,
      message: "Administrator updated successfully",
      admin: {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
