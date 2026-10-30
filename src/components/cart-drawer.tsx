"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Coins,
  ArrowRight,
  ShieldCheck,
  Package,
} from "lucide-react";

export function CartDrawer() {
  const router = useRouter();
  const {
    items,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    totalCount,
    totalInr,
    totalCoins,
  } = useCart();

  if (!isCartOpen) return null;

  const handleProceedToBuy = () => {
    closeCart();
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-slide-left border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-100">
                {totalCount} {totalCount === 1 ? "item" : "items"}
              </span>
            </div>

            <button
              onClick={closeCart}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Explore our Products, Trail Kits, and Home Essentials to add items.
                </p>
                <div className="pt-2">
                  <button
                    onClick={closeCart}
                    className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Return to Store
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const isTrial = item.product.product_type === "TRIAL";
                  const unitPrice = Number(item.product.price_inr) || 0;
                  const unitCoins = Number(item.product.coin_price) || 0;
                  const linePrice = unitPrice * item.quantity;
                  const lineCoins = unitCoins * item.quantity;

                  return (
                    <div
                      key={item.lineId}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex gap-3 items-center hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 relative">
                        <img
                          src={item.product.image_url || "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80"}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info & Modifiers */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {item.product.brand}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 truncate">
                          {item.product.title}
                        </h4>

                        {item.variantName && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            Variant: {item.variantName}
                          </div>
                        )}

                        {/* Price Display */}
                        <div className="mt-1 flex items-center gap-2">
                          {isTrial ? (
                            <span className="text-xs font-bold font-mono text-amber-800 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-600" />
                              <span>{lineCoins === 0 ? "Free Trial" : `${lineCoins} Coins`}</span>
                            </span>
                          ) : (
                            <span className="text-xs font-bold font-mono text-slate-900">
                              ₹{linePrice.toLocaleString("en-IN")}
                              {item.quantity > 1 && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  (₹{unitPrice} ea)
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.lineId)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Free Delivery Banner */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free doorstep delivery included for all household items.</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 space-y-3">
              <div className="space-y-1.5 text-xs">
                {totalInr > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{totalInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {totalCoins > 0 && (
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>Coin Redemption</span>
                    </span>
                    <span className="font-mono font-bold">
                      {totalCoins.toLocaleString()} Coins
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600">
                  <span>Doorstep Delivery</span>
                  <span className="font-semibold text-emerald-700 uppercase text-[10px]">
                    FREE
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">Total Payable</span>
                  <div className="text-right">
                    {totalInr > 0 ? (
                      <span className="font-mono font-bold text-base text-slate-900">
                        ₹{totalInr.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-sm text-emerald-700">
                        ₹0 (0 INR)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Proceed to Buy Button */}
              <button
                onClick={handleProceedToBuy}
                className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Buy</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={closeCart}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
