// src/pages/CartPage.tsx
import { useMemo } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import type { Product } from '../lib/supabase';

export default function CartPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { cartArray, totalItems, addItem, removeItem, setQuantity, clearCart } = useCart();
  const { user } = useAuth?.() ?? { user: null };

  const subtotal = useMemo(
    () => cartArray.reduce((s, e) => s + Number(e.product?.price ?? 0) * e.qty, 0),
    [cartArray]
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }),
    []
  );

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Your Cart</h1>
            <p className="text-sm text-gray-500 mt-1">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onNavigate) onNavigate('home');
              }}
              className="text-sm text-gray-700 px-3 py-1 rounded hover:bg-gray-50"
            >
              Continue shopping
            </button>

            <button
              onClick={() => clearCart()}
              className="text-sm text-red-600 px-3 py-1 rounded hover:bg-red-50 border border-red-100"
            >
              Clear cart
            </button>
          </div>
        </div>

        {cartArray.length === 0 ? (
          <div className="py-20 text-center text-gray-600">
            Your cart is empty. <button onClick={() => onNavigate && onNavigate('home')} className="text-rose-600 hover:underline ml-1">Go shopping</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartArray.map(({ product, qty }) => {
                const p = product as Product;
                const stock = (p.stock_quantity ?? Infinity);
                const disableIncrease = qty >= stock;
                return (
                  <div key={p.id} className="flex items-center gap-4 bg-white border rounded-lg p-4">
                    <img
                      src={(p as any).image_url ?? `/assets/new/${p.id}.jpg`}
                      alt={p.name}
                      className="w-20 h-20 object-cover rounded-md"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          {p.short_description && <div className="text-sm text-gray-500 line-clamp-2">{p.short_description}</div>}
                        </div>

                        <div className="text-sm font-semibold">{formatter.format(Number(p.price ?? 0))}</div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => removeItem(p, 1)}
                          className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                          aria-label={`Decrease ${p.name}`}
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            if (Number.isNaN(v)) return;
                            setQuantity(p.id, Math.max(0, Math.floor(v)));
                          }}
                          className="w-16 text-center border rounded px-1 py-0.5 text-sm"
                        />

                        <button
                          onClick={() => addItem(p, 1)}
                          disabled={disableIncrease}
                          className={`px-2 py-1 border rounded text-sm ${disableIncrease ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                          aria-label={`Increase ${p.name}`}
                        >
                          +
                        </button>

                        <div className="text-xs text-gray-500 ml-3">
                          {Number.isFinite(stock) ? `In stock: ${stock}` : 'In stock'}
                        </div>

                        <button
                          onClick={() => setQuantity(p.id, 0)}
                          className="ml-auto text-sm text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="bg-white border rounded-lg p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">Subtotal</div>
                <div className="font-semibold">{formatter.format(subtotal)}</div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (!user && onNavigate) {
                      onNavigate('login');
                    } else {
                      onNavigate && onNavigate('checkout');
                    }
                  }}
                  className="w-full bg-rose-600 text-white py-2 rounded"
                >
                  Checkout
                </button>

                <button
                  onClick={() => clearCart()}
                  className="w-full border py-2 rounded text-gray-700"
                >
                  Clear cart
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
