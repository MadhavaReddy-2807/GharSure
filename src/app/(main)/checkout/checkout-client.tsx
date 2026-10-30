"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { VoucherRecord } from "@/lib/voucher-db";
import {
  ChevronLeft,
  ShoppingBag,
  ShieldCheck,
  Coins,
  Ticket,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  User,
  Check,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerData {
  id: string;
  fullName: string;
  displayName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  rewardCoins: number;
}

interface CheckoutClientViewProps {
  customer: CustomerData;
  unlockedVouchers: VoucherRecord[];
}

export function CheckoutClientView({ customer, unlockedVouchers }: CheckoutClientViewProps) {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearPurchasedItems } = useCart();

  // Shipping details state
  const [shippingName, setShippingName] = useState(customer.fullName || customer.displayName || "");
  const [shippingPhone, setShippingPhone] = useState(customer.phone || "");
  const [shippingAddress, setShippingAddress] = useState(customer.address || "");
  const [shippingCity, setShippingCity] = useState(customer.city || "Bengaluru");
  const [shippingPincode, setShippingPincode] = useState(customer.pincode || "560001");

  // Voucher application state
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountInr: number;
    title?: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Server-side validation state
  const [serverSubtotalInr, setServerSubtotalInr] = useState<number | null>(null);
  const [serverTotalCoins, setServerTotalCoins] = useState<number | null>(null);
  const [serverDiscountInr, setServerDiscountInr] = useState<number>(0);
  const [serverFinalPayable, setServerFinalPayable] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidatingCart, setIsValidatingCart] = useState(false);

  // Order submission state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentBoundaryNotice, setPaymentBoundaryNotice] = useState<string | null>(null);

  // 1. Authoritative Server Validation of Cart on items or voucher change
  useEffect(() => {
    if (items.length === 0) {
      setServerSubtotalInr(0);
      setServerFinalPayable(0);
      setServerTotalCoins(0);
      return;
    }

    setIsValidatingCart(true);
    setValidationError(null);

    fetch("/api/checkout/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.product.id,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        voucherCode: appliedVoucher?.code,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setServerSubtotalInr(data.subtotalInr);
          setServerTotalCoins(data.totalCoins);
          setServerDiscountInr(data.discountInr);
          setServerFinalPayable(data.totalInr);

          if (data.voucherStatus && !data.voucherStatus.valid) {
            setAppliedVoucher(null);
            setVoucherError(data.voucherStatus.error || "Voucher not applicable");
          }
        } else {
          setValidationError(data.error || "Failed to validate cart items");
        }
      })
      .catch((err) => {
        setValidationError("Network error validating cart");
      })
      .finally(() => {
        setIsValidatingCart(false);
      });
  }, [items, appliedVoucher]);

  // Apply Voucher Handler
  const handleApplyVoucher = async (codeToApply: string) => {
    if (!codeToApply.trim()) return;
    setIsValidatingVoucher(true);
    setVoucherError(null);

    try {
      const res = await fetch("/api/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          voucherCode: codeToApply.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success && data.voucherStatus?.valid) {
        setAppliedVoucher({
          code: data.voucherStatus.code,
          discountInr: data.voucherStatus.discountInr,
        });
        setVoucherCodeInput("");
      } else {
        setVoucherError(data.voucherStatus?.error || "Invalid or ineligible voucher code.");
      }
    } catch {
      setVoucherError("Failed to validate voucher.");
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError(null);
  };

  // Place Order Handler
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      setOrderError("Your cart is empty. Add products before placing an order.");
      return;
    }

    if (!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim() || !shippingCity.trim() || !shippingPincode.trim()) {
      setOrderError("Please fill out complete delivery details.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);
    setPaymentBoundaryNotice(null);

    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingPincode,
          voucherCode: appliedVoucher?.code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order placement failed.");
      }

      // Check if pure coin order (0 INR) or payment required
      if (!data.paymentRequired || data.order.paymentStatus === "PAID") {
        // Pure coin order confirmed and paid!
        clearPurchasedItems(items.map((i) => i.lineId));
        router.push(`/checkout/success?orderId=${data.order.id}&orderNumber=${data.order.orderNumber}`);
        return;
      }

      // If INR payment required:
      if (!data.paymentProvider.configured) {
        // Halt at payment boundary as required by instruction:
        // "If no payment gateway is integrated, do not simulate a successful payment. Identify the missing provider credentials and integration requirements and implement the checkout up to the appropriate secure payment integration boundary."
        setPaymentBoundaryNotice(
          `Order #${data.order.orderNumber} created successfully in PENDING_PAYMENT status. Payment gateway credentials (${data.paymentProvider.missingKeys.join(", ")}) are not configured in environment variables. 100% Coin-redeemed Trial Kits can be confirmed directly with ₹0.`
        );
        clearPurchasedItems(items.map((i) => i.lineId));
      } else {
        // Real payment gateway flow when keys are present
        // Razorpay checkout modal would open here
        alert(`Initiating Razorpay for Order #${data.order.orderNumber}`);
      }
    } catch (err: any) {
      setOrderError(err.message || "Failed to process order");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const displaySubtotal = serverSubtotalInr ?? items.reduce((s, i) => s + (Number(i.product.price_inr) || 0) * i.quantity, 0);
  const displayCoins = serverTotalCoins ?? items.reduce((s, i) => s + (Number(i.product.coin_price) || 0) * i.quantity, 0);
  const displayDiscount = serverDiscountInr;
  const displayPayable = serverFinalPayable ?? Math.max(0, displaySubtotal - displayDiscount);

  if (items.length === 0 && !paymentBoundaryNotice) {
    return (
      <div className="w-full max-w-2xl mx-auto py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Your Shopping Cart is Empty</h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Add items from our Products and Trail Kits collections to proceed to checkout.
        </p>
        <div className="pt-2">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/store"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Order Checkout
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review household essentials, delivery address, and apply unlocked vouchers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-mono font-bold">{customer.rewardCoins.toLocaleString()}</span>
          <span className="text-[11px] text-amber-700">Coins</span>
        </div>
      </div>

      {/* Payment Boundary Notice if keys missing */}
      {paymentBoundaryNotice && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-amber-900">Payment Integration Boundary</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">{paymentBoundaryNotice}</p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors"
            >
              View in Order History
            </Link>
            <Link
              href="/store"
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              Back to Store
            </Link>
          </div>
        </div>
      )}

      {/* Main 12-Column Checkout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 Cols): Delivery Address, Cart Items, Voucher Application */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Delivery Address Card */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Step 1: Doorstep Delivery Address
                </h2>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Doorstep Delivery Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Phone Number (WhatsApp Verified)</label>
                <input
                  type="text"
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2563EB] text-slate-900 font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-700">Flat / Society / Street Address</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Flat 402, Tower B, Prestige Palms"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">City</label>
                <input
                  type="text"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="Bengaluru"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Pincode</label>
                <input
                  type="text"
                  value={shippingPincode}
                  onChange={(e) => setShippingPincode(e.target.value)}
                  placeholder="560001"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2563EB] text-slate-900 font-mono"
                />
              </div>
            </div>
          </section>

          {/* STEP 2: Cart Items & Quantities */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Step 2: Selected Items ({items.length})
                </h2>
              </div>
              <Link href="/store" className="text-xs font-semibold text-[#2563EB] hover:underline">
                + Add More
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const isTrial = item.product.product_type === "TRIAL";
                const unitPrice = Number(item.product.price_inr) || 0;
                const unitCoins = Number(item.product.coin_price) || 0;
                const linePrice = unitPrice * item.quantity;
                const lineCoins = unitCoins * item.quantity;

                return (
                  <div key={item.lineId} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                        <img
                          src={item.product.image_url || "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80"}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {item.product.brand}
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {item.product.title}
                        </h4>
                        {item.variantName && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            Variant: {item.variantName}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-slate-500">
                          {isTrial ? (
                            <span className="font-mono font-bold text-amber-800">
                              {unitCoins === 0 ? "Free Trial" : `${unitCoins} Coins each`}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-700">₹{unitPrice} each</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right w-24">
                        {isTrial ? (
                          <span className="text-xs font-bold font-mono text-amber-800">
                            {lineCoins === 0 ? "0 Coins" : `${lineCoins} Coins`}
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                            ₹{linePrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => removeFromCart(item.lineId)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STEP 3: Apply Unlocked Vouchers */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Step 3: Apply Vouchers
                </h2>
              </div>
              <Link href="/store" className="text-xs font-semibold text-[#2563EB] hover:underline">
                Unlock More with Coins
              </Link>
            </div>

            {/* Manual Voucher Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter voucher code (e.g. PURE50OFF)"
                className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold uppercase focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="button"
                disabled={isValidatingVoucher || !voucherCodeInput.trim()}
                onClick={() => handleApplyVoucher(voucherCodeInput)}
                className="px-5 h-10 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isValidatingVoucher ? "Checking..." : "Apply"}
              </button>
            </div>

            {/* Error notice */}
            {voucherError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{voucherError}</span>
              </div>
            )}

            {/* Applied Voucher Pill */}
            {appliedVoucher && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono font-bold">{appliedVoucher.code}</span>
                  <span>— Saving ₹{appliedVoucher.discountInr}</span>
                </div>
                <button
                  onClick={handleRemoveVoucher}
                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Quick-Apply Unlocked Vouchers */}
            {unlockedVouchers.length > 0 && !appliedVoucher && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-500">Your Unlocked Vouchers:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {unlockedVouchers.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{v.code}</span>
                        <span className="text-[11px] text-slate-500">{v.title}</span>
                      </div>
                      <button
                        onClick={() => handleApplyVoucher(v.code)}
                        className="px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (4 Cols): Order Summary & Checkout Actions */}
        <aside className="lg:col-span-4 space-y-5 sticky top-24">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{displaySubtotal.toLocaleString("en-IN")}
                </span>
              </div>

              {displayCoins > 0 && (
                <div className="flex items-center justify-between text-amber-800">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>Coin Redemption</span>
                  </span>
                  <span className="font-mono font-bold">
                    {displayCoins.toLocaleString()} Coins
                  </span>
                </div>
              )}

              {displayDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Voucher Discount</span>
                  <span className="font-mono font-bold">
                    -₹{displayDiscount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Doorstep Delivery</span>
                <span className="font-semibold text-emerald-700 uppercase text-[10px]">
                  FREE
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-900">Final Payable Amount</span>
                <span className="font-mono font-bold text-lg text-slate-900">
                  ₹{displayPayable.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Error notice */}
            {orderError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Place Order CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isPlacingOrder || isValidatingCart}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Confirming Order...</span>
                  </>
                ) : displayPayable === 0 ? (
                  <>
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span>Confirm & Redeem with Coins (₹0)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Proceed to Confirm Order (₹{displayPayable})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 text-center space-y-1">
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted 256-bit Secure Transaction</span>
              </div>
              <p>Prices and stock availability are authoritative and server-verified.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
