// src/pages/CategoryPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';

type CategoryPageProps = {
  categorySlug: string;
};

export default function CategoryPage({ categorySlug }: CategoryPageProps) {
  const { user } = useAuth();
  const { addItem: ctxAddItem, removeItem: ctxRemoveItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<Record<string, number>>({});

  const inr = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }),
    []
  );

  // Fetch products by category slug
  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);
      try {
        const { data: categories, error: catErr } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', categorySlug)
          .maybeSingle();

        if (catErr) throw catErr;

        if (categories) {
          setCategoryName(categories.name);

          const { data: prods, error: prodErr } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', categories.id)
            .order('created_at', { ascending: false });

          if (prodErr) throw prodErr;
          if (mounted) setProducts(prods || []);
        }
      } catch (e) {
        console.error('Failed to load category products:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [categorySlug]);

  // Load local cart snapshot
  useEffect(() => {
    if (!user) {
      try {
        const raw = localStorage.getItem('skin_cart');
        const map = raw ? JSON.parse(raw) : {};
        setCartItems(map);
      } catch (e) {
        console.warn('Failed to load local cart:', e);
      }
    }
  }, [user]);

  // Load wishlist from localStorage if not logged in
  useEffect(() => {
    if (user) return; // Skip if logged in, context handles it
  }, [user]);

  const handleAddToCart = async (product: Product) => {
    if (!product.id) return;
    try {
      await ctxAddItem(product, 1);
      setCartItems((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] ?? 0) + 1,
      }));
    } catch (e) {
      console.error('Failed to add item to cart:', e);
    }
  };

  const getProductImage = (product: Product) => {
    if (product.image_url) return product.image_url;
    return `/assets/new/${product.id}.jpg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 capitalize">{categoryName || categorySlug}</h1>
          <p className="text-gray-600 mt-2">{products.length} products</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const qty = cartItems[product.id] ?? 0;
              const outOfStock = product.stock_quantity === 0;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-all transform hover:-translate-y-1 relative"
                >
                  {qty > 0 && (
                    <div className="absolute top-3 left-3 z-20 bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {qty}
                    </div>
                  )}

                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <button
                      onClick={() => toggleWishlist(product)}
                      className={`p-2 rounded-full transition ${
                        isInWishlist(product.id)
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-gray-400 hover:text-rose-600'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                    </button>
                  </div>

                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                          Out of stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 md:p-6">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.short_description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold text-gray-900">
                        {product.price != null ? inr.format(Number(product.price)) : '—'}
                      </span>
                      {qty > 0 && <span className="text-sm text-gray-500">· {qty} in cart</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => ctxRemoveItem(product, 1)}
                            className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition"
                          >
                            −
                          </button>
                          <div className="px-3 py-1.5 rounded-full text-sm font-semibold bg-white border">
                            {qty}
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={outOfStock}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              outOfStock
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-rose-600 text-white hover:bg-rose-700'
                            }`}
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={outOfStock}
                          className={`px-1 text-sm font-medium transition ${
                            outOfStock
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-rose-600 hover:text-rose-700'
                          }`}
                        >
                          Add to Cart
                        </button>
                      )}
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
