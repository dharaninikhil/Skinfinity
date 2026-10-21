// src/components/ProductCard.tsx
//
// The single product tile used by the home page, category, concern, search,
// new-arrivals and wishlist grids. Category and concern pages previously
// duplicated ~120 lines of this markup each, which is how the wishlist button
// and stock handling drifted out of sync between pages.
import type { KeyboardEvent, ReactNode } from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useNavigate } from '../hooks/useRoute';
import { formatINR, toNumber } from '../lib/format';
import { PRODUCT_PLACEHOLDER, fallbackTo, productImage } from '../lib/images';
import { productPath } from '../lib/products';
import type { Product } from '../lib/supabase';
import { DiscountBadge } from './ui';

export type ProductCardProps = {
  product: Product;
  /** Show the "New" pill. Defaults to the product's own `is_new` flag. */
  showNewBadge?: boolean;
  className?: string;
};

export default function ProductCard({ product, showNewBadge, className = '' }: ProductCardProps) {
  const navigate = useNavigate();
  const { cartItems, addItem, removeItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const qty = cartItems[product.id] ?? 0;
  const stock = product.stock_quantity ?? null;
  const outOfStock = stock !== null && toNumber(stock) <= 0;
  const atStockLimit = stock !== null && qty >= toNumber(stock);
  const wished = isInWishlist(product.id);
  const showNew = showNewBadge ?? Boolean(product.is_new);
  const rating = toNumber(product.rating);

  const open = () => navigate(productPath(product));
  const openKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={openKey}
        aria-label={`View ${product.name}`}
        className="relative aspect-square cursor-pointer overflow-hidden bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <img
          src={productImage(product)}
          alt={product.name}
          loading="lazy"
          onError={fallbackTo(PRODUCT_PLACEHOLDER)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {qty > 0 && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
              {qty} in cart
            </span>
          )}
          {showNew && (
            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-medium text-white shadow">New</span>
          )}
          <DiscountBadge price={product.price} compareAt={product.compare_at_price} />
        </div>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900">Out of stock</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void toggleWishlist(product)}
        aria-pressed={wished}
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        title={wished ? 'Remove from wishlist' : 'Save to wishlist'}
        className="absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-sm transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <Heart className={`h-5 w-5 ${wished ? 'fill-rose-600 text-rose-600' : 'text-gray-400'}`} />
      </button>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        {product.category?.name && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">{product.category.name}</p>
        )}

        <h3 className="mb-1 line-clamp-2 font-medium text-gray-900">
          <button type="button" onClick={open} className="text-left hover:text-rose-700 focus:outline-none">
            {product.name}
          </button>
        </h3>

        {product.short_description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">{product.short_description}</p>
        )}

        {rating > 0 && (
          <div className="mb-3 flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
            {toNumber(product.review_count) > 0 && <span>({toNumber(product.review_count)})</span>}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-gray-900">{formatINR(product.price)}</span>
            {toNumber(product.compare_at_price) > toNumber(product.price) && (
              <span className="text-sm text-gray-400 line-through">{formatINR(product.compare_at_price)}</span>
            )}
          </div>

          {qty > 0 ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void removeItem(product, 1)}
                aria-label={`Decrease quantity of ${product.name}`}
                className="h-8 w-8 rounded-full bg-gray-100 text-base font-medium text-gray-700 transition hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                −
              </button>
              <span className="min-w-[1.75rem] rounded-full border bg-white py-1 text-center text-sm font-semibold">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => void addItem(product, 1)}
                disabled={outOfStock || atStockLimit}
                aria-label={`Increase quantity of ${product.name}`}
                className="h-8 w-8 rounded-full bg-rose-600 text-base font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void addItem(product, 1)}
              disabled={outOfStock}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? 'Sold out' : 'Add'}
            </button>
          )}
        </div>

        {stock !== null && !outOfStock && toNumber(stock) <= 5 && (
          <p className="mt-2 text-xs font-medium text-amber-600">Only {toNumber(stock)} left</p>
        )}
      </div>
    </article>
  );
}

/** Responsive grid wrapper so every page lays products out identically. */
export function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
