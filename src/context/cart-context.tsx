"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

export interface ProductItem {
  id: string;
  title: string;
  summary: string;
  price_inr: string | number;
  coin_price?: number;
  brand: string;
  category: string;
  product_type?: "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT" | string;
  image_url?: string;
  inventory_stock?: number;
  is_featured?: boolean;
  score: number | null;
  specifications?: Record<string, any>;
}

export interface ProductVariant {
  id: string;
  name: string;
  price_inr?: number;
  coin_price?: number;
  inventory_stock?: number;
}

export interface CartItem {
  lineId: string;
  product: ProductItem;
  variantId?: string;
  variantName?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductItem, variant?: ProductVariant, quantity?: number) => void;
  removeFromCart: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  clearPurchasedItems: (purchasedLineIds: string[]) => void;
  totalCount: number;
  totalInr: number;
  totalCoins: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "gharsure_cart_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize lineId if migrating from v1
          const normalized = parsed.map((item: any) => ({
            lineId: item.lineId || `${item.product.id}_${item.variantId || "default"}`,
            product: item.product,
            variantId: item.variantId,
            variantName: item.variantName,
            quantity: item.quantity || 1,
          }));
          setItems(normalized);
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore write errors
    }
  }, [items, isLoaded]);

  const addToCart = (product: ProductItem, variant?: ProductVariant, qty: number = 1) => {
    const lineId = variant ? `${product.id}_${variant.id}` : `${product.id}_default`;

    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        // Enforce inventory stock limit if provided
        const maxStock = variant?.inventory_stock ?? product.inventory_stock ?? 99;
        const newQty = Math.min(existing.quantity + qty, maxStock);
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: newQty } : i
        );
      }

      return [
        ...prev,
        {
          lineId,
          product,
          variantId: variant?.id,
          variantName: variant?.name,
          quantity: qty,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId && i.product.id !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(lineId);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.lineId === lineId || i.product.id === lineId) {
          const maxStock = i.product.inventory_stock ?? 99;
          return { ...i, quantity: Math.min(quantity, maxStock) };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const clearPurchasedItems = (purchasedLineIds: string[]) => {
    setItems((prev) => prev.filter((i) => !purchasedLineIds.includes(i.lineId) && !purchasedLineIds.includes(i.product.id)));
  };

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalInr = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.product.price_inr) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const totalCoins = useMemo(() => {
    return items.reduce((sum, item) => {
      const coins = Number(item.product.coin_price) || 0;
      return sum + coins * item.quantity;
    }, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        clearPurchasedItems,
        totalCount,
        totalInr,
        totalCoins,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
