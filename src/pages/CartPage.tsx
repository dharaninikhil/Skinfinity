// src/pages/CartPage.tsx
import { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { Button, EmptyState, Spinner } from '../components/ui';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useRoute';
import { formatINR, toNumber } from '../lib/format';
import { PRODUCT_PLACEHOLDER, fallbackTo, productImage } from '../lib/images';
import { FREE_SHIPPING_THRESHOLD, shippingFeeFor } from '../lib/checkout';
import { productPath } from '../lib/products';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartArray, totalItems, subtotal, hydrating, syncing, addItem, removeItem, setQuantity, clearCart } =
    useCart();
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (hydrating) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading your cart" />
      </div>
    );
  }

  if (cartArray.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-12 w-12" />}
        title="Your cart is empty"
        description="Browse new arrivals or shop by skin concern to find your next favourite."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate('new')}>Shop new arrivals</Button>
            <Button variant="secondary" onClick={() => navigate('home')}>
              Back to home
            </Button>
          </div>
        }
      />
    );
  }

  const shipping = shippingFeeFor(subtotal);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your cart</h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalItems} item{totalItems === 1 ? '' : 's'}
              {syncing && <span className="ml-2 text-gray-400">· syncing…</span>}
              {!user && <span className="ml-2 text-gray-400">· saved on this device</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('new')}>
              Continue shopping
            </Button>
            {confirmingClear ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Clear all {totalItems} items?</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    void clearCart();
                    setConfirmingClear(false);
                  }}
                >
                  Yes, clear
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingClear(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirmingClear(true)}>
                <Trash2 className="h-4 w-4" /> Clear cart
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Lines */}
          <ul className="space-y-4 lg:col-span-2">
            {cartArray.map(({ product, qty }) => {
              const stock = product.stock_quantity ?? null;
              const available = stock === null ? null : toNumber(stock);
              const atLimit = available !== null && qty >= available;
              const lineTotal = toNumber(product.price) * qty;

              return (
                <li
                  key={product.id}
                  className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => navigate(productPath(product))}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 sm:h-28 sm:w-28"
                    aria-label={`View ${product.name}`}
                  >
                    <img
                      src={productImage(product)}
                      alt={product.name}
                      loading="lazy"
                      onError={fallbackTo(PRODUCT_PLACEHOLDER)}
                      className="h-full w-full object-cover"
                    />
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {product.category?.name && (
                          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                            {product.category.name}
                          </p>
                        )}
                        <h2 className="truncate font-medium text-gray-900">
                          <button
                            type="button"
                            onClick={() => navigate(productPath(product))}
                            className="text-left hover:text-rose-700 focus:outline-none"
                          >
                            {product.name}
                          </button>
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">{formatINR(product.price)} each</p>
                      </div>

                      <p className="shrink-0 font-semibold text-gray-900">{formatINR(lineTotal)}</p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
                      <div className="flex items-center gap-1 rounded-full border border-gray-200 p-1">
                        <button
                          type="button"
                          onClick={() => void removeItem(product, 1)}
                          className="rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          aria-label={`Decrease quantity of ${product.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        <label className="sr-only" htmlFor={`cart-qty-${product.id}`}>
                          Quantity of {product.name}
                        </label>
                        <input
                          id={`cart-qty-${product.id}`}
                          type="number"
                          min={0}
                          max={available ?? 99}
                          value={qty}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isNaN(next)) void setQuantity(product.id, Math.max(0, Math.floor(next)));
                          }}
                          className="w-12 border-0 bg-transparent text-center text-sm font-semibold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />

                        <button
                          type="button"
                          onClick={() => void addItem(product, 1)}
                          disabled={atLimit}
                          className="rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          aria-label={`Increase quantity of ${product.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {available !== null && (
                        <span className="text-xs text-gray-500">
                          {atLimit ? `Max available: ${available}` : `${available} in stock`}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void setQuantity(product.id, 0)}
                        className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-red-600 focus:outline-none focus-visible:underline"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Summary */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50/70 px-3 py-2.5 text-xs text-rose-800">
                <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {remaining > 0
                    ? `Add ${formatINR(remaining)} more to unlock free shipping.`
                    : 'Free shipping unlocked.'}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-gray-900">{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gray-600">
                  <dt>Shipping</dt>
                  <dd className="font-medium text-gray-900">{shipping === 0 ? 'Free' : formatINR(shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                  <dt className="font-semibold text-gray-900">Total</dt>
                  <dd className="font-semibold text-gray-900">{formatINR(subtotal + shipping)}</dd>
                </div>
              </dl>

              <Button size="lg" className="mt-5 w-full" onClick={() => navigate('checkout')}>
                Checkout <ArrowRight className="h-4 w-4" />
              </Button>

              {!user && (
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="mt-3 w-full text-center text-xs text-gray-500 underline-offset-2 hover:text-rose-600 hover:underline"
                >
                  Sign in to sync this cart across your devices
                </button>
              )}

              <p className="mt-4 text-center text-xs text-gray-400">
                Taxes included · Cash on delivery available
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
