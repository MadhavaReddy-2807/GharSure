import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, verifyRequestSession } from "@/lib/session";
import { createOrder } from "@/lib/order-db";
import { getCustomerById } from "@/lib/supabase/db";
import { z } from "zod";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product ID is required"),
      variantId: z.string().optional(),
      quantity: z.number().int().positive("Quantity must be at least 1"),
    })
  ).min(1, "At least one item is required in the cart"),
  shippingName: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingAddress: z.union([
    z.string().min(3, "Delivery address is required"),
    z.object({
      addressLine1: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      pincode: z.string().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    }),
  ]),
  shippingCity: z.string().optional(),
  shippingPincode: z.string().optional(),
  voucherCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = (await verifyRequestSession(req)) || (await getCurrentSession());
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please log in with your phone number to complete checkout." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid checkout details" },
        { status: 400 }
      );
    }

    const raw = parsed.data;
    let shippingName = raw.shippingName;
    let shippingPhone = raw.shippingPhone || session.phone;
    let shippingAddress = "";
    let shippingCity = raw.shippingCity || "";
    let shippingPincode = raw.shippingPincode || "";

    if (typeof raw.shippingAddress === "string") {
      shippingAddress = raw.shippingAddress;
    } else if (raw.shippingAddress && typeof raw.shippingAddress === "object") {
      shippingAddress = raw.shippingAddress.addressLine1 || raw.shippingAddress.address || "";
      if (!shippingCity) shippingCity = raw.shippingAddress.city || "";
      if (!shippingPincode) shippingPincode = raw.shippingAddress.pincode || "";
      if (!shippingName && raw.shippingAddress.name) shippingName = raw.shippingAddress.name;
      if (raw.shippingAddress.phone) shippingPhone = raw.shippingAddress.phone;
    }

    if (!shippingName) {
      const customer = await getCustomerById(session.customerId);
      shippingName = customer?.full_name || session.readableId || "GharSure Resident";
    }

    if (!shippingAddress || shippingAddress.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Valid delivery address is required." },
        { status: 400 }
      );
    }

    if (!shippingCity || shippingCity.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "City is required." },
        { status: 400 }
      );
    }

    if (!shippingPincode || shippingPincode.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Valid postal PIN code is required." },
        { status: 400 }
      );
    }

    const result = await createOrder({
      customerId: session.customerId,
      items: raw.items,
      shippingName: shippingName.trim(),
      shippingPhone: shippingPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      shippingCity: shippingCity.trim(),
      shippingPincode: shippingPincode.trim(),
      voucherCode: raw.voucherCode,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      paymentRequired: result.paymentRequired,
      paymentProvider: result.paymentProvider,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
