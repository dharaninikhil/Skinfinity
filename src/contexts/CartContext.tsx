// src/contexts/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { Product } from '../lib/supabase';

type CartEntry = {
  product: Product;
  qty: number;
};

type CartState = Record<string, number>;

type CartContextType = {
  cartItems: CartState;           // id -> qty
  cartArray: CartEntry[];        // for rendering
  totalItems: number;
  addItem: (product: Product, qty?: number) => void;
  removeItem: (product: Product, qty?: number) => void;
  setQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = 'skinfinity_cart_v2';
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartState) : {};
    } catch {
      return {};
    }
  });

  // keep product snapshots in ref to avoid re-renders when adding snapshot only
  const productsRef = useRef<Record<string, Product>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const addItem = (product: Product, qty = 1) => {
    if (!product?.id) return;
    // store snapshot
    productsRef.current[product.id] = product;
    setCartItems((prev) => {
      const current = prev[product.id] ?? 0;
      return { ...prev, [product.id]: current + qty };
    });
  };

  const removeItem = (product: Product, qty = 1) => {
    if (!product?.id) return;
    setCartItems((prev) => {
      const current = prev[product.id] ?? 0;
      const next = current - qty;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return { ...prev, [product.id]: next };
    });
  };

  const setQuantity = (productId: string, qty: number) => {
    if (!productId) return;
    setCartItems((prev) => {
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: qty };
    });
  };

  const clearCart = () => {
    setCartItems({});
    // keep snapshots (optional) — if you want to drop snapshots too: productsRef.current = {}
  };

  const cartArray = useMemo<CartEntry[]>(() => {
    return Object.entries(cartItems).map(([id, qty]) => {
      const product = productsRef.current[id];
      return {
        product: product ?? ({ id, name: 'Product', price: 0, short_description: '' } as unknown as Product),
        qty,
      };
    });
  }, [cartItems]);

  const totalItems = useMemo(() => Object.values(cartItems).reduce((s, n) => s + n, 0), [cartItems]);

  const value: CartContextType = {
    cartItems,
    cartArray,
    totalItems,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
