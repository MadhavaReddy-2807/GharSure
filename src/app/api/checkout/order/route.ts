import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { createOrder } from "@/lib/order-db";
import { z } from "zod";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product ID is required"),
      variantId: z.string().optional(),
      quantity: z.number().int().positive("Quantity must be at least 1"),
    })
  ).min(1, "At least one item is required in the cart"),
  shippingName: z.string().min(2, "Name is required"),
  shippingPhone: z.string().min(10, "Valid 10-digit phone number is required"),
  shippingAddress: z.string().min(5, "Delivery address is required"),
  shippingCity: z.string().min(2, "City is required"),
  shippingPincode: z.string().min(6, "Valid pincode is required"),
  voucherCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.customerId) {
      return NextResponse.json(
        { success: false, error: "Please log in with your phone number to complete checkout." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid checkout details" },
        { status: 400 }
      );
    }

    const result = await createOrder({
      customerId: session.customerId,
      ...parsed.data,
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
