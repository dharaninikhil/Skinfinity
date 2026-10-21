// src/pages/WishlistPage.tsx
//
// The wishlist context now returns normalised products, so this page no longer
// needs to parse `product_json` rows or refetch missing products itself.
import { useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import ProductCard, { ProductGrid } from '../components/ProductCard';
import { Button, EmptyState, PageLoader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from '../hooks/useRoute';
import { pluralize, toNumber } from '../lib/format';
import type { Product } from '../lib/supabase';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { items, loading, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);

  if (loading) return <PageLoader label="Loading your wishlist" />;

  const moveAllToCart = async () => {
    const purchasable = items.filter((product) => toNumber(product.stock_quantity) > 0 || product.stock_quantity == null);
    if (purchasable.length === 0) {
      toast('Everything saved is currently out of stock.', 'error');
      return;
    }
    // Sequential on purpose: each add re-clamps against live stock.
    for (const product of purchasable) {
      await addItem(product, 1);
    }
    const skipped = items.length - purchasable.length;
    toast(
      `Added ${pluralize(purchasable.length, 'item')} to your cart${
        skipped > 0 ? ` · ${skipped} skipped (out of stock)` : ''
      }.`,
      'success'
    );
  };

  return (
    <div className="bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-12 w-12" />}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here for later."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate('new')}>Shop new arrivals</Button>
                <Button variant="secondary" onClick={() => navigate('home')}>
                  Back to home
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your wishlist</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {pluralize(items.length, 'saved item')}
                  {!user && ' · stored on this device only'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => void moveAllToCart()}>
                  <ShoppingCart className="h-4 w-4" /> Move all to cart
                </Button>

                {confirming ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Remove all {items.length}?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await clearWishlist();
                        setConfirming(false);
                        toast('Wishlist cleared.', 'success');
                      }}
                    >
                      Yes, clear
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" className="text-red-600" onClick={() => setConfirming(true)}>
                    Clear wishlist
                  </Button>
                )}
              </div>
            </div>

            {!user && (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-sm text-rose-900">
                <p className="flex-1">
                  Sign in to keep your wishlist across devices — it merges automatically when you do.
                </p>
                <Button size="sm" onClick={() => navigate('login')}>
                  Sign in
                </Button>
              </div>
            )}

            <ProductGrid>
              {items.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </>
        )}
      </div>
    </div>
  );
}
