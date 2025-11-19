// src/pages/ConcernPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Heart } from 'lucide-react';

import {
  supabase,
  Product,
  SkinConcern,
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';

type ConcernPageProps = {
  concernSlug: string; // slug or human string
};

export default function ConcernPage({ concernSlug }: ConcernPageProps) {
  const { user } = useAuth();
  const { addItem: ctxAddItem, removeItem: ctxRemoveItem, setQuantity: ctxSetQuantity } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [products, setProducts] = useState<Product[]>([]);
  const [concern, setConcern] = useState<SkinConcern | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // server-backed cart state: map productId -> qty (page snapshot)
  const [cartItems, setCartItems] = useState<Record<string, number>>({});

  // currency formatter for INR
  const inr = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }),
    []
  );

  useEffect(() => {
    fetchConcernAndProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concernSlug]);

  // load cart snapshot when user changes
  useEffect(() => {
    if (!user) {
      try {
        const raw = localStorage.getItem('skin_cart');
        setCartItems(raw ? JSON.parse(raw) : {});
      } catch {
        setCartItems({});
      }
    }
  }, [user]);

  const fetchConcernAndProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    setProducts([]);
    setConcern(null);

    try {
      // Try exact slug
      let { data: concernData, error } = await supabase
        .from('skin_concerns')
        .select('*')
        .eq('slug', concernSlug)
        .maybeSingle();
      if (error) throw error;

      // Try normalized slug
      if (!concernData) {
        const normalized = String(concernSlug).trim().toLowerCase().replace(/\s+/g, '-');
        const { data: byNormalized, error: e2 } = await supabase
          .from('skin_concerns')
          .select('*')
          .eq('slug', normalized)
          .maybeSingle();
        if (e2) throw e2;
        concernData = byNormalized ?? null;
      }

      // Try case-insensitive name match
      if (!concernData) {
        const { data: byName, error: e3 } = await supabase
          .from('skin_concerns')
          .select('*')
          .ilike('name', `%${concernSlug}%`)
          .maybeSingle();
        if (e3) throw e3;
        concernData = byName ?? null;
      }

      if (!concernData) {
        setErrorMsg(`Could not find concern "${concernSlug}". Try using the concern slug (e.g. "sensitive-skin").`);
        setLoading(false);
        return;
      }

      setConcern(concernData);

      // fetch product_concerns rows for this concern
      const { data: productConcerns, error: pcErr } = await supabase
        .from('product_concerns')
        .select('product_id')
        .eq('concern_id', concernData.id);

      if (pcErr) throw pcErr;

      if (productConcerns && productConcerns.length > 0) {
        const productIds = productConcerns.map((pc) => pc.product_id);

        const { data: productsData, error: productsErr } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)
          .order('created_at', { ascending: false });

        if (productsErr) throw productsErr;

        if (productsData) setProducts(productsData);
      }
    } catch (err: any) {
      console.error('Error fetching concern/products:', err);
      setErrorMsg(err?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-xl text-center">
          <p className="text-red-600 mb-4">{errorMsg}</p>
          <p className="text-gray-600">
            Tip: use the concern slug in the URL (example:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">sensitive-skin</code>) or check Admin → Skin Concerns for the exact slug.
          </p>
        </div>
      </div>
    );
  }

  if (!concern) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Concern not found</p>
      </div>
    );
  }

  // cart helpers
  const getQty = (productId?: string | null) => {
    if (!productId) return 0;
    return cartItems[productId] ?? 0;
  };

  const addToCart = async (product: Product, delta = 1) => {
    if (!product?.id) return;
    if (product.stock_quantity === 0) return;

    // optimistic UI
    setCartItems((prev) => {
      const next = { ...prev, [product.id]: (prev[product.id] ?? 0) + delta };
      return next;
    });

    // update global context immediately (so cart drawer updates)
    try {
      ctxAddItem(product, delta);
    } catch {
      // ignore
    }

    if (!user) {
      try {
        const raw = localStorage.getItem('skin_cart');
        const local = raw ? JSON.parse(raw) : {};
        local[product.id] = (local[product.id] ?? 0) + delta;
        if (product.stock_quantity != null && local[product.id] > product.stock_quantity) {
          local[product.id] = product.stock_quantity;
        }
        localStorage.setItem('skin_cart', JSON.stringify(local));
      } catch (e) {
        console.warn('local cart write failed', e);
      }
      return;
    }

    // if your CartContext handles server sync, it will update server — no page-level server sync here
    try {
      ctxSetQuantity(product.id, (cartItems[product.id] ?? 0) + delta);
    } catch {
      // ignore
    }
  };

  const removeFromCart = async (product: Product, delta = 1) => {
    if (!product?.id) return;

    // optimistic UI
    setCartItems((prev) => {
      const prevQty = prev[product.id] ?? 0;
      const nextQty = Math.max(0, prevQty - delta);
      const next = { ...prev };
      if (nextQty === 0) delete next[product.id];
      else next[product.id] = nextQty;
      return next;
    });

    // update global context immediately
    try {
      ctxRemoveItem(product, delta);
    } catch {
      // ignore
    }

    if (!user) {
      try {
        const raw = localStorage.getItem('skin_cart');
        const local = raw ? JSON.parse(raw) : {};
        const prevQty = local[product.id] ?? 0;
        const nextQty = Math.max(0, prevQty - delta);
        if (nextQty === 0) delete local[product.id];
        else local[product.id] = nextQty;
        localStorage.setItem('skin_cart', JSON.stringify(local));
      } catch {
        // ignore
      }
      return;
    }

    try {
      ctxSetQuantity(product.id, Math.max(0, (cartItems[product.id] ?? 0) - delta));
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-blue-50 to-rose-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">{concern.name}</h1>
          <p className="text-lg text-gray-600 max-w-2xl">{concern.description}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600">No products available for this concern yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => {
              const qty = getQty(product.id);
              const outOfStock = product.stock_quantity === 0;
              const disableIncrease = outOfStock || (product.stock_quantity != null && qty >= (product.stock_quantity ?? 0));
              const wished = isInWishlist(product.id);

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative"
                >
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                    {product.is_new && (
                      <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        New
                      </div>
                    )}

                    {/* Wishlist button (matches CategoryPage UI) */}
                    <button
                      onClick={() => toggleWishlist(product)}
                      aria-pressed={wished}
                      aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                      className={`absolute top-3 right-14 p-2 rounded-full shadow-sm transition-transform transform hover:scale-105 focus:outline-none ${
                        wished ? 'bg-white' : 'bg-white'
                      }`}
                      title={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={`w-5 h-5 ${wished ? 'text-rose-600' : 'text-gray-400'}`} />
                    </button>

                    {qty > 0 && (
                      <div className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {qty}
                      </div>
                    )}

                    {outOfStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium">Out of Stock</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.short_description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">
                        {product.price != null ? inr.format(Number(product.price)) : '—'}
                      </span>

                      {/* Add / +/- controls */}
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() => removeFromCart(product, 1)}
                              className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>

                            <div className="px-3 py-1.5 rounded-full text-sm font-semibold bg-white border">{qty}</div>

                            <button
                              onClick={() => addToCart(product, 1)}
                              disabled={disableIncrease}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                disableIncrease ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700'
                              }`}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToCart(product, 1)}
                            disabled={outOfStock}
                            className={`text-sm font-medium text-rose-600 hover:text-rose-700 disabled:text-gray-400 disabled:cursor-not-allowed`}
                          >
                            {product.stock_quantity === 0 ? 'Sold Out' : 'Add to Cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
