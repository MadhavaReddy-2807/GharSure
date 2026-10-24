import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestSession, clearSessionCookie } from "@/lib/session";
import { getCustomerById, updateCustomerProfile, logAuditEvent } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";

const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100)
    .optional()
    .or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    let surveysCompleted = 0;
    let referralsRewarded = 0;

    if (isDirectDatabaseConfigured()) {
      try {
        const sql = getDirectSql();
        const [surveyStat] = await sql`
          SELECT count(*)::text as count FROM survey_responses 
          WHERE customer_id = ${customer.id} AND status = 'COMPLETED';
        `;
        surveysCompleted = parseInt(surveyStat?.count || "0", 10);

        const [refStat] = await sql`
          SELECT count(*)::text as count FROM referral_attributions
          WHERE referrer_id = ${customer.id} AND status = 'REWARDED';
        `;
        referralsRewarded = parseInt(refStat?.count || "0", 10);
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: customer.id,
        customerId: customer.customer_id,
        phone: customer.phone_e164,
        fullName: customer.full_name || customer.display_name || "Resident",
        city: customer.city || "Not set",
        rewardCoins: customer.reward_coins || 0,
        referralCode: customer.referral_code,
        surveysCompleted,
        referralsRewarded,
        createdAt: customer.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { fullName, city } = parsed.data;
    const updated = await updateCustomerProfile(session.customerId, {
      fullName,
      city: city && city.trim().length > 0 ? city.trim() : null,
      displayName: fullName.split(" ")[0],
    });

    await logAuditEvent(
      "CUSTOMER_PROFILE_UPDATED",
      undefined,
      session.customerId,
      undefined,
      { fullName, city: city || null }
    );

    return NextResponse.json({
      success: true,
      profile: {
        fullName: updated.full_name,
        city: updated.city,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (isDirectDatabaseConfigured()) {
      const sql = getDirectSql();
      await sql`
        UPDATE customers
        SET status = 'DELETED', updated_at = NOW()
        WHERE id = ${session.customerId};
      `;
    }

    await logAuditEvent(
      "CUSTOMER_ACCOUNT_DELETION_REQUESTED",
      session.phone,
      session.customerId,
      undefined,
      { phone: session.phone }
    );

    const response = NextResponse.json({
      success: true,
      message: "Account deactivation request processed successfully.",
    });

    clearSessionCookie(response);
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
