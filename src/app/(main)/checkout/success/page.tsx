import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getOrderById } from "@/lib/order-db";
import {
  CheckCircle2,
  Package,
  MapPin,
  Calendar,
  Coins,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; orderNumber?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.customerId) {
    redirect("/auth");
  }

  const { orderId, orderNumber } = await searchParams;
  const targetId = orderId || orderNumber;

  let order = null;
  if (targetId) {
    order = await getOrderById(targetId, session.customerId);
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-10 sm:py-16 space-y-6">
      {/* Confirmation Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            Order Confirmed
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight pt-1">
            Thank You for Your Order!
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your household order has been registered and is being prepared for doorstep delivery.
          </p>
        </div>

        {/* Order Details Strip */}
        {order && (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Order Number
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {order.orderNumber}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Payment Status
                </span>
                <span className="font-bold text-emerald-700 font-mono">
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Line Items */}
            {order.items && order.items.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="font-bold text-slate-700 block">Purchased Items:</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{item.title}</span>
                        {item.variantName && (
                          <span className="text-slate-400 ml-1">({item.variantName})</span>
                        )}
                        <span className="text-slate-500 block text-[11px]">Qty: {item.quantity}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-800 text-right">
                        {item.totalCoins > 0 ? (
                          <span className="text-amber-800">{item.totalCoins} Coins</span>
                        ) : (
                          <span>₹{item.totalPriceInr.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="pt-2 flex items-start gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Delivering to:</span>
                <span>
                  {order.shippingName} — {order.shippingAddress}, {order.shippingCity} ({order.shippingPincode})
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
              <span>Total Paid:</span>
              <div className="font-mono text-sm">
                {order.totalInr > 0 ? `₹${order.totalInr.toLocaleString("en-IN")}` : "₹0 (0 INR)"}
                {order.totalCoins > 0 && ` + ${order.totalCoins} Coins`}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/profile"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            View in Order History
          </Link>
          <Link
            href="/store"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
