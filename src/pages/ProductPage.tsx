// src/pages/ProductPage.tsx
//
// Product detail page. The storefront previously had no way to view a single
// product: cards were not links and `products.slug` was never used.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Droplets,
  FlaskConical,
  Heart,
  Minus,
  PackageOpen,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import ProductCard, { ProductGrid } from '../components/ProductCard';
import { Button, DiscountBadge, EmptyState, Spinner } from '../components/ui';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useNavigate } from '../hooks/useRoute';
import { formatDate, formatINR, toNumber } from '../lib/format';
import { PRODUCT_PLACEHOLDER, fallbackTo, productImage } from '../lib/images';
import {
  fetchProductById,
  fetchProductBySlug,
  fetchRelatedProducts,
  type Product,
} from '../lib/supabase';

type ProductPageProps = {
  /** Slug preferred; falls back to a raw product id for legacy links. */
  productSlug: string;
};

export default function ProductPage({ productSlug }: ProductPageProps) {
  const navigate = useNavigate();
  const { addItem, removeItem, cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      setProduct(null);
      setRelated([]);
      setQuantity(1);

      try {
        // Accept either a slug or a bare uuid so old links keep working.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productSlug
        );
        const found = isUuid
          ? await fetchProductById(productSlug)
          : await fetchProductBySlug(productSlug);

        if (!active) return;

        if (!found) {
          setError(null);
          setProduct(null);
          setLoading(false);
          return;
        }

        setProduct(found);
        if (found.slug && found.slug !== productSlug) {
          // Normalise the URL to the canonical slug (no history entry).
          navigate(`/product/${encodeURIComponent(found.slug)}`, { replace: true, keepScroll: true });
        }

        try {
          const siblings = await fetchRelatedProducts(found, 4);
          if (active) setRelated(siblings);
        } catch {
          // Related products are a nice-to-have; ignore failures.
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load this product.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSlug]);

  const inCartQty = product ? cartItems[product.id] ?? 0 : 0;
  const stock = product?.stock_quantity ?? null;
  const available = stock === null ? null : toNumber(stock);
  const outOfStock = available !== null && available <= 0;
  const maxAddable = available === null ? 99 : Math.max(0, available - inCartQty);

  const handleAdd = useCallback(async () => {
    if (!product) return;
    await addItem(product, quantity);
  }, [addItem, product, quantity]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading product" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-10 w-10" />}
        title="We could not load this product"
        description={error}
        action={<Button onClick={() => navigate('home')}>Back to home</Button>}
      />
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-10 w-10" />}
        title="Product not found"
        description="This product may have been discontinued or the link is incorrect."
        action={
          <div className="flex gap-3">
            <Button onClick={() => navigate('new')}>Browse new arrivals</Button>
            <Button variant="secondary" onClick={() => navigate('home')}>
              Back to home
            </Button>
          </div>
        }
      />
    );
  }

  const wished = isInWishlist(product.id);
  const rating = toNumber(product.rating);
  const concerns = product.concerns ?? [];

  return (
    <div className="bg-white">
      <nav aria-label="Breadcrumb" className="border-b border-gray-100 bg-gray-50/60">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-3 text-xs text-gray-500 sm:px-6 lg:px-8">
          <li>
            <button type="button" onClick={() => navigate('home')} className="hover:text-rose-600">
              Home
            </button>
          </li>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          {product.category?.slug ? (
            <li className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`category-${product.category?.slug}`)}
                className="hover:text-rose-600"
              >
                {product.category.name}
              </button>
              <ChevronRight className="h-3 w-3 text-gray-300" />
            </li>
          ) : null}
          <li className="font-medium text-gray-700">{product.name}</li>
        </ol>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-gray-50">
              <img
                src={productImage(product)}
                alt={product.name}
                onError={fallbackTo(PRODUCT_PLACEHOLDER)}
                className="h-full w-full object-cover"
              />
              {product.is_new && (
                <span className="absolute left-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-medium text-white">
                  New
                </span>
              )}
              {outOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-900">
                    Out of stock
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            {product.category?.name && (
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
                {product.category.name}
              </p>
            )}

            <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">{product.name}</h1>

            {product.short_description && (
              <p className="mt-3 text-gray-600">{product.short_description}</p>
            )}

            {rating > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-sm">
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </span>
                <span className="font-medium text-gray-800">{rating.toFixed(1)}</span>
                {toNumber(product.review_count) > 0 && (
                  <span className="text-gray-500">({toNumber(product.review_count)} reviews)</span>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-semibold text-gray-900">{formatINR(product.price)}</span>
              {toNumber(product.compare_at_price) > toNumber(product.price) && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatINR(product.compare_at_price)}
                  </span>
                  <DiscountBadge price={product.price} compareAt={product.compare_at_price} />
                </>
              )}
            </div>

            <p className="mt-2 text-sm text-gray-500">Inclusive of all taxes</p>

            {/* Stock */}
            <div className="mt-5">
              {outOfStock ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                  <PackageOpen className="h-4 w-4" /> Out of stock
                </p>
              ) : available !== null && available <= 5 ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                  Hurry — only {available} left
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> In stock
                </p>
              )}
            </div>

            {/* Quantity + actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-semibold" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  disabled={available !== null && quantity >= available}
                  className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                onClick={() => void handleAdd()}
                disabled={outOfStock || maxAddable <= 0}
                className="flex-1 sm:flex-none"
              >
                <ShoppingCart className="h-4 w-4" />
                {outOfStock
                  ? 'Sold out'
                  : inCartQty > 0
                    ? `Add ${quantity} more (${inCartQty} in cart)`
                    : `Add ${quantity} to cart`}
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={() => void toggleWishlist(product)}
                aria-pressed={wished}
                aria-label={
                  wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
                }
              >
                <Heart className={`h-4 w-4 ${wished ? 'fill-rose-600 text-rose-600' : ''}`} />
                {wished ? 'Saved' : 'Save'}
              </Button>
            </div>

            {inCartQty > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-rose-50/70 px-4 py-3 text-sm">
                <span className="font-medium text-rose-800">{inCartQty} in your cart</span>
                <button
                  type="button"
                  onClick={() => void removeItem(product, 1)}
                  className="text-rose-700 underline-offset-2 hover:underline"
                >
                  Remove one
                </button>
                <button
                  type="button"
                  onClick={() => navigate('cart')}
                  className="ml-auto font-semibold text-rose-700 underline-offset-2 hover:underline"
                >
                  Go to cart
                </button>
              </div>
            )}

            {/* Reassurance */}
            <ul className="mt-6 grid gap-3 border-t border-gray-100 pt-6 text-sm text-gray-600 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-rose-500" /> Free shipping over ₹1,499
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-rose-500" /> 100% authentic, imported
              </li>
              <li className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-rose-500" /> 7-day returns on unopened items
              </li>
              <li className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-rose-500" /> Patch-test before first use
              </li>
            </ul>

            {/* Concern chips */}
            {concerns.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Good for
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {concerns.map((concern) => (
                    <button
                      key={concern.id}
                      type="button"
                      onClick={() => navigate(`concern-${concern.slug ?? concern.name}`)}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-rose-100 hover:text-rose-700"
                    >
                      {concern.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Long-form */}
            <div className="mt-8 space-y-6 border-t border-gray-100 pt-6">
              {product.description && (
                <DetailBlock heading="Description">
                  <p className="leading-relaxed text-gray-600">{product.description}</p>
                </DetailBlock>
              )}

              {product.how_to_use && (
                <DetailBlock heading="How to use">
                  <p className="leading-relaxed text-gray-600">{product.how_to_use}</p>
                </DetailBlock>
              )}

              {product.ingredients && (
                <DetailBlock heading="Key ingredients">
                  <p className="leading-relaxed text-gray-600">{product.ingredients}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <FlaskConical className="h-3.5 w-3.5" /> Always check the pack for the full INCI list.
                  </p>
                </DetailBlock>
              )}

              <DetailBlock heading="Product details">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-500">SKU</dt>
                  <dd className="font-mono text-xs text-gray-800">{product.id.slice(0, 8)}</dd>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-800">{product.category?.name ?? '—'}</dd>
                  <dt className="text-gray-500">Listed on</dt>
                  <dd className="text-gray-800">{formatDate(product.created_at)}</dd>
                </dl>
              </DetailBlock>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-gray-100 pt-12">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Complete the routine</h2>
            <ProductGrid>
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </ProductGrid>
          </section>
        )}
      </div>
    </div>
  );
}

function DetailBlock({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900">{heading}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
