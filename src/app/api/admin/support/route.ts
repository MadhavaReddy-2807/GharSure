import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession, hasAdminPermission } from "@/lib/admin-auth";
import { listSupportTicketsAdmin, saveSupportTicketAdmin, logAdminAuditEvent } from "@/lib/admin-db";
import { z } from "zod";

const ticketSchema = z.object({
  id: z.string().uuid().optional(),
  ticketNumber: z.string().optional(),
  customerId: z.string().uuid().optional(),
  subject: z.string().min(3),
  category: z.string().default("General Inquiry"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).default("OPEN"),
  assignedTo: z.string().uuid().nullable().optional(),
  note: z.string().optional(),
});

export async function GET() {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "support:read")) {
      return NextResponse.json({ success: false, error: "Forbidden: support:read required" }, { status: 403 });
    }

    const tickets = await listSupportTicketsAdmin();
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdminSession();
    if (!admin || !hasAdminPermission(admin.role, "support:write")) {
      return NextResponse.json({ success: false, error: "Forbidden: support:write required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const ticket = await saveSupportTicketAdmin({
      ...parsed.data,
      adminEmail: admin.email,
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAuditEvent({
      eventType: parsed.data.id ? "ADMIN_SUPPORT_TICKET_UPDATED" : "ADMIN_SUPPORT_TICKET_CREATED",
      adminId: admin.adminId,
      customerId: ticket.customer_id,
      ipAddress: ip,
      metadata: { ticketNumber: ticket.ticket_number, status: ticket.status, priority: ticket.priority },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
