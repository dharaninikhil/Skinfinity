// src/components/CartDrawer.tsx
//
// Slide-over cart. Previously this component was never mounted anywhere and its
// Checkout button was an empty `TODO`, so it is wired into the app shell here.
import { useEffect } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from '../hooks/useRoute';
import { formatINR, pluralize, toNumber } from '../lib/format';
import { fallbackTo, productImage, PRODUCT_PLACEHOLDER } from '../lib/images';
import { FREE_SHIPPING_THRESHOLD, shippingFeeFor } from '../lib/checkout';
import { Button, Spinner } from './ui';
import { productPath } from '../lib/products';

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const { cartArray, totalItems, subtotal, hydrating, syncing, addItem, removeItem, setQuantity, clearCart } = useCart();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const shipping = shippingFeeFor(subtotal);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const goCheckout = () => {
    onClose();
    navigate('checkout');
  };

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <aside className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ShoppingBag className="h-5 w-5 text-rose-600" />
            Your cart
            {totalItems > 0 && <span className="text-sm font-normal text-gray-500">({pluralize(totalItems, 'item')})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {hydrating ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading your cart" />
          </div>
        ) : cartArray.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="rounded-full bg-rose-50 p-5">
              <ShoppingBag className="h-8 w-8 text-rose-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Your cart is empty</p>
              <p className="mt-1 text-sm text-gray-500">Add a few favourites and they will show up here.</p>
            </div>
            <Button
              onClick={() => {
                onClose();
                navigate('home');
              }}
            >
              Start shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-gray-100 bg-rose-50/50 px-5 py-3">
              {remainingForFreeShipping > 0 ? (
                <p className="text-xs text-gray-700">
                  Add <span className="font-semibold">{formatINR(remainingForFreeShipping)}</span> more for free shipping
                </p>
              ) : (
                <p className="text-xs font-medium text-emerald-700">You have unlocked free shipping 🎉</p>
              )}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {cartArray.map(({ product, qty }) => {
                const stock = product.stock_quantity ?? null;
                const lineTotal = toNumber(product.price) * qty;
                const atLimit = stock !== null && qty >= toNumber(stock);

                return (
                  <li key={product.id} className="flex gap-3 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(productPath(product));
                      }}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</p>
                        <button
                          type="button"
                          onClick={() => void setQuantity(product.id, 0)}
                          className="shrink-0 rounded p-1 text-gray-400 transition hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          aria-label={`Remove ${product.name} from cart`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500">{formatINR(product.price)} each</p>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-1 rounded-full border border-gray-200 p-0.5">
                          <button
                            type="button"
                            onClick={() => void removeItem(product, 1)}
                            className="rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            aria-label={`Decrease quantity of ${product.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <label className="sr-only" htmlFor={`drawer-qty-${product.id}`}>
                            Quantity of {product.name}
                          </label>
                          <input
                            id={`drawer-qty-${product.id}`}
                            type="number"
                            min={0}
                            max={stock !== null ? toNumber(stock) : 99}
                            value={qty}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (!Number.isNaN(next)) void setQuantity(product.id, Math.max(0, Math.floor(next)));
                            }}
                            className="w-10 border-0 bg-transparent text-center text-sm font-semibold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

                        <span className="text-sm font-semibold text-gray-900">{formatINR(lineTotal)}</span>
                      </div>

                      {atLimit && stock !== null && (
                        <p className="mt-1 text-[11px] font-medium text-amber-600">
                          Max available: {toNumber(stock)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <footer className="border-t border-gray-100 px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-gray-900">{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gray-600">
                  <dt>Shipping</dt>
                  <dd className="font-medium text-gray-900">{shipping === 0 ? 'Free' : formatINR(shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base">
                  <dt className="font-semibold text-gray-900">Total</dt>
                  <dd className="font-semibold text-gray-900">{formatINR(subtotal + shipping)}</dd>
                </div>
              </dl>

              {syncing && <p className="mt-2 text-xs text-gray-400">Syncing your cart…</p>}

              <div className="mt-4 flex gap-2">
                <Button onClick={goCheckout} className="flex-1" size="lg">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    onClose();
                    navigate('cart');
                  }}
                >
                  View cart
                </Button>
              </div>

              <button
                type="button"
                onClick={() => void clearCart()}
                className="mt-3 w-full text-center text-xs text-gray-400 transition hover:text-red-600"
              >
                Clear cart
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
