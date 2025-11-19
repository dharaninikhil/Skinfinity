// src/pages/WishlistPage.tsx
import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

type WishlistRow = {
  id?: string;
  user_id?: string | null;
  product_id?: string | null;
  product_json?: any;
  created_at?: string;
};

export default function WishlistPage(): JSX.Element {
  const { items, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const { addItem, removeItem, cartItems } = useCart();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Check if value is a Product
  const isProduct = (obj: any): obj is Product => {
    return !!obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.name === 'string';
  };

  // Extract Product from WishlistRow or Product
  const extractProductFromRow = (row: any): Product | null => {
    if (!row) return null;
    if (isProduct(row)) return row;

    if (row.product_json) {
      const pj =
        typeof row.product_json === 'string'
          ? (() => {
              try {
                return JSON.parse(row.product_json);
              } catch {
                return null;
              }
            })()
          : row.product_json;

      if (isProduct(pj)) return pj;
    }

    return null;
  };

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);

      try {
        /** -----------------------------------------
         * CASE 1: No wishlist rows at all
         * ----------------------------------------- */
        if (!items || items.length === 0) {
          // Anonymous user fallback: localstorage
          try {
            const raw = localStorage.getItem('skin_wishlist');
            if (raw) {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr) && arr.length > 0) {
                if (mounted) setProducts(arr as Product[]);
                setLoading(false);
                return;
              }
            }
          } catch {}

          if (mounted) setProducts([]);
          setLoading(false);
          return;
        }

        /** -----------------------------------------
         * CASE 2: Extract products from wishlist rows
         * ----------------------------------------- */
        const directProducts: Product[] = [];
        const missingIds: string[] = [];

        for (const row of items as any[]) {
          const p = extractProductFromRow(row);
          if (p) {
            directProducts.push(p);
          } else if ((row as WishlistRow).product_id) {
            missingIds.push((row as WishlistRow).product_id!);
          }
        }

        /** -----------------------------------------
         * Fetch missing product rows
         * ----------------------------------------- */
        let fetched: Product[] = [];

        if (missingIds.length > 0) {
          const res = (await supabase
            .from('products')
            .select('*')
            .in('id', missingIds)) as { data: Product[] | null; error: any };

          if (res.data) fetched = res.data;
        }

        /** -----------------------------------------
         * Merge direct + fetched products
         * ----------------------------------------- */
        const final: Product[] = [];
        const seen = new Set<string>();
        const map = new Map<string, Product>();

        [...directProducts, ...fetched].forEach((p) => {
          if (p && p.id) map.set(p.id, p);
        });

        // Keep same order as wishlist
        for (const row of items as any[]) {
          const p = extractProductFromRow(row);
          if (p && !seen.has(p.id)) {
            final.push(p);
            seen.add(p.id);
            continue;
          }

          const pid = (row as WishlistRow).product_id;
          if (pid && map.get(pid) && !seen.has(pid)) {
            final.push(map.get(pid)!);
            seen.add(pid);
          }
        }

        if (mounted) setProducts(final);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [items]);

  // Clear wishlist handler — NO confirmation, immediate action
  const clearWishlist = async () => {
    setLoading(true);
    try {
      // If user is not logged in, clear localStorage fallback
      if (!user) {
        localStorage.removeItem('skin_wishlist');

        // Best-effort: call toggleWishlist for resolved products to keep UI/context consistent
        if (Array.isArray(items) && items.length > 0) {
          for (const row of items as any[]) {
            const p = extractProductFromRow(row);
            if (p) {
              try {
                // toggleWishlist should remove the item from context/local copy
                // we await to keep order, but ignore failures
                await toggleWishlist(p);
              } catch {
                // ignore errors from toggle
              }
            }
          }
        }

        setProducts([]);
        return;
      }

      // Logged-in user: delete wishlist rows from Supabase
      const rowIds: string[] = [];
      for (const row of items as any[]) {
        if (row && typeof row.id === 'string') rowIds.push(row.id);
      }

      if (rowIds.length > 0) {
        const res = (await supabase.from('wishlists').delete().in('id', rowIds)) as { data: any; error: any };
        if (res.error) {
          // Fall back to deleting by user_id if the specific ids failed
          console.error('Failed to delete wishlist rows by id:', res.error);
          const res2 = (await supabase.from('wishlists').delete().eq('user_id', user.id)) as { data: any; error: any };
          if (res2.error) {
            console.error('Fallback delete by user_id failed:', res2.error);
            // proceed — nothing more to do
          }
        }
      } else {
        // No row ids present — delete by user_id
        const res = (await supabase.from('wishlists').delete().eq('user_id', user.id)) as { data: any; error: any };
        if (res.error) {
          console.error('Failed to delete wishlist rows by user_id:', res.error);
          // proceed
        }
      }

      // Best-effort: toggleWishlist for each resolved product to update UI/context
      if (Array.isArray(items) && items.length > 0) {
        for (const row of items as any[]) {
          const p = extractProductFromRow(row);
          if (p) {
            try {
              await toggleWishlist(p);
            } catch {
              // ignore
            }
          }
        }
      }

      // clear local products shown
      setProducts([]);
    } catch (err) {
      console.error('clearWishlist error', err);
    } finally {
      setLoading(false);
    }
  };

  // debug
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('WishlistPage: wishlist rows (items) =>', items);
    // eslint-disable-next-line no-console
    console.log('WishlistPage: resolved products =>', products);
  }, [items, products]);

  const qtyFor = (p: Product) => cartItems?.[p.id] ?? 0;

  if (wishlistLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  // EMPTY: no wishlist rows (local fallback already attempted)
  if (!items || (Array.isArray(items) && items.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-semibold text-gray-800 mb-3">Your wishlist is empty</h2>
        <p className="text-gray-600 max-w-sm">Tap the ❤️ icon on products to save them here for later.</p>
      </div>
    );
  }

  // There are wishlist rows but no product details could be resolved
  if ((items && items.length > 0) && (!products || products.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">No visible products</h2>
        <p className="text-gray-600 max-w-md mb-4">
          You have items in your wishlist, but we couldn't display product details. This can happen if product records were removed
          or if the server blocked fetching product rows (RLS/policies). Check the console/network for errors.
        </p>
        <p className="text-sm text-gray-500">If you're the developer, ensure `product_json` is saved on insert or products are readable by the client.</p>
        <div className="mt-6">
          <button
            onClick={clearWishlist}
            className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
          >
            Clear wishlist
          </button>
        </div>
      </div>
    );
  }

  // SHOW resolved products
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Your Wishlist</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={clearWishlist}
              className="inline-flex items-center px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
              title="Remove all items from your wishlist"
            >
              Clear wishlist
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              qty={qtyFor(product)}
              onAdd={(p) => addItem(p, 1)}
              onRemove={(p) => removeItem(p, 1)}
              onToggleWishlist={(p) => toggleWishlist(p)}
              isWished
            />
          ))}
        </div>
      </div>
    </div>
  );
}
