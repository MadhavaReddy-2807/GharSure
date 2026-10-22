import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyAdminPassword,
  signAdminSession,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import { getAdminByEmail, recordAdminLogin, logAdminAuditEvent } from "@/lib/admin-db";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid work email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const admin = await getAdminByEmail(email);

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!admin) {
      await logAdminAuditEvent({
        eventType: "ADMIN_LOGIN_FAILED_NOT_FOUND",
        ipAddress: ip,
        metadata: { attemptedEmail: email },
      });
      return NextResponse.json(
        { success: false, error: "Invalid email or credentials" },
        { status: 401 }
      );
    }

    if (admin.status !== "ACTIVE") {
      await logAdminAuditEvent({
        eventType: "ADMIN_LOGIN_FAILED_SUSPENDED",
        adminId: admin.id,
        ipAddress: ip,
        metadata: { status: admin.status },
      });
      return NextResponse.json(
        { success: false, error: "This administrator account is suspended or pending activation." },
        { status: 403 }
      );
    }

    const isValidPassword = verifyAdminPassword(password, admin.password_hash);
    if (!isValidPassword) {
      await logAdminAuditEvent({
        eventType: "ADMIN_LOGIN_FAILED_PASSWORD",
        adminId: admin.id,
        ipAddress: ip,
      });
      return NextResponse.json(
        { success: false, error: "Invalid email or credentials" },
        { status: 401 }
      );
    }

    // Success: record login timestamp
    await recordAdminLogin(admin.id);
    await logAdminAuditEvent({
      eventType: "ADMIN_LOGIN_SUCCESS",
      adminId: admin.id,
      ipAddress: ip,
      metadata: { role: admin.role },
    });

    const token = await signAdminSession({
      adminId: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      role: admin.role,
      status: admin.status,
    });

    const res = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        role: admin.role,
      },
    });

    setAdminSessionCookie(res, token);
    return res;
  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
