// src/components/CartDrawer.tsx
import React from 'react';
import { useCart } from '../contexts/CartContext';
import type { Product } from '../lib/supabase';

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { cartArray, totalItems, addItem, removeItem, setQuantity, clearCart } = useCart();

  const subtotal = cartArray.reduce((s, e) => s + Number(e.product.price ?? 0) * e.qty, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside className="ml-auto w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Cart ({totalItems})</h3>
          <button onClick={onClose} className="text-sm text-gray-600">Close</button>
        </div>

        <div className="p-4">
          {cartArray.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Your cart is empty</div>
          ) : (
            <>
              <ul className="space-y-4">
                {cartArray.map(({ product, qty }) => (
                  <li key={product.id} className="flex items-center gap-3">
                    <img src={(product as any).image_url ?? `/assets/new/${product.id}.jpg`} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.short_description}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => removeItem(product, 1)} className="text-sm px-2 py-1">−</button>
                        <input
                          value={qty}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            if (!Number.isNaN(v)) setQuantity(product.id, v);
                          }}
                          className="w-12 text-center border rounded px-1 py-0.5"
                        />
                        <button onClick={() => addItem(product, 1)} className="text-sm px-2 py-1">+</button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(product.price ?? 0))}</div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(subtotal)}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={() => { /* TODO: go to checkout */ }} className="flex-1 bg-rose-600 text-white py-2 rounded">Checkout</button>
                  <button onClick={() => clearCart()} className="flex-1 border py-2 rounded text-gray-700">Clear</button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
