"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useCart } from "@/context/cart-context";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Coins,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Package,
} from "lucide-react";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalCount,
    totalInr,
    totalCoins,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setOrderPlaced(true);
      setTimeout(() => {
        setOrderPlaced(false);
        clearCart();
        closeCart();
      }, 2500);
    }, 1000);
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
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                {totalCount}
              </span>
            </div>

            <button
              onClick={closeCart}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {orderPlaced ? (
              <div className="py-16 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-slate-900">Order Placed Successfully!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Your household order has been confirmed. Doorstep delivery is being dispatched.
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Explore our Products and Trail Kits to add items to your cart.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map(({ product, quantity }) => {
                  const isTrial = product.product_type === "TRIAL";
                  const unitPrice = Number(product.price_inr) || 0;
                  const unitCoins = product.coin_price ?? 0;

                  return (
                    <div key={product.id} className="py-4 first:pt-0 last:pb-0 flex gap-3.5">
                      {/* Image Thumbnail */}
                      <div className="w-18 h-18 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden relative flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                              {product.brand}
                            </span>
                            {isTrial ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Trail Kit
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                Product
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 mt-0.5">
                            {product.title}
                          </h4>
                        </div>

                        {/* Quantity and Price */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 border border-slate-200 rounded-md p-0.5">
                            <button
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-semibold font-mono px-1">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {isTrial ? (
                              <span className="text-xs font-bold font-mono text-amber-900 flex items-center gap-0.5">
                                <Coins className="w-3.5 h-3.5 text-amber-600" />
                                <span>{unitCoins === 0 ? "Free" : `${unitCoins * quantity} Coins`}</span>
                              </span>
                            ) : (
                              <span className="text-xs font-bold font-mono text-slate-900">
                                ₹{(unitPrice * quantity).toLocaleString("en-IN")}
                              </span>
                            )}

                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {items.length > 0 && !orderPlaced && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 space-y-3">
              <div className="space-y-1.5 text-xs">
                {totalInr > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Products Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{totalInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {totalCoins > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Trail Kits Total</span>
                    <span className="font-mono font-bold text-amber-800 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>{totalCoins} Coins</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600">
                  <span>Doorstep Delivery</span>
                  <span className="font-semibold text-emerald-600 uppercase text-[10px]">FREE</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Total
                </span>
                <div className="text-right">
                  {totalInr > 0 && (
                    <div className="text-base font-bold font-mono text-slate-900">
                      ₹{totalInr.toLocaleString("en-IN")}
                    </div>
                  )}
                  {totalCoins > 0 && (
                    <div className="text-xs font-bold font-mono text-amber-800">
                      + {totalCoins} Coins
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery notice */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Doorstep delivery to your registered address.</span>
              </div>

              {/* Friendly bright blue button (no black buttons!) */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isCheckingOut ? "Processing Order..." : "Proceed to Checkout"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
