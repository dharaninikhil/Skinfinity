// src/pages/HomePage.tsx
import { Sparkles, Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase, Product, Category } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';

type HomePageProps = {
  onNavigate: (page: string) => void;
};

const CATEGORY_IMAGES: Record<string, string> = {
  new: '/assets/categories/new.jpeg',
  cleanser: '/assets/categories/cleanser.jpeg',
  toner: '/assets/categories/toner.jpeg',
  'ampoule-serum': '/assets/categories/ampoule-serum.jpeg',
  moisturizer: '/assets/categories/moisturizer.jpeg',
  'mask-treatment': '/assets/categories/mask-treatment.jpeg',
  sunscreen: '/assets/categories/sunscreen.webp',
  lipcare: '/assets/categories/lipcare.jpeg',
  sets: '/assets/categories/sets.webp',
  merchandise: '/assets/categories/merchandise.webp',
  default: '/assets/categories/default.jpg',
};

const normalizeSlug = (s?: string | null) =>
  (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '-');

const dedupeKey = (s?: string | null) =>
  (s ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

export default function HomePage({ onNavigate }: HomePageProps) {
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { addItem, removeItem, cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // NEW: control whether to show all new products
  const [showAllNew, setShowAllNew] = useState(false);

  // newsletter state for footer
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    fetchNewProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNewProducts() {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_new', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setNewProducts(data);
    } catch (e) {
      console.error('fetchNewProducts error', e);
    }
  }

  async function fetchCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(20);
      if (data) setCategories(data);
    } catch (e) {
      console.error('fetchCategories error', e);
    }
  }

  const getProductImage = (product: Product) => {
    if ((product as any).image_url) return (product as any).image_url;
    return `/assets/new/${product.id}.jpg`;
  };

  const REQUIRED_CATEGORIES: Category[] = [
    { id: 'sunscreen', name: 'Sunscreen', slug: 'sunscreen' } as Category,
    { id: 'lipcare', name: 'Lip Care', slug: 'lipcare' } as Category,
    { id: 'sets', name: 'Sets', slug: 'sets' } as Category,
    { id: 'merchandise', name: 'Merchandise', slug: 'merchandise' } as Category,
  ];

  const displayedCategories = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      if (!c) continue;
      const key = dedupeKey(c.slug ?? c.name);
      map.set(key, c);
    }
    for (const rc of REQUIRED_CATEGORIES) {
      const key = dedupeKey(rc.slug ?? rc.name);
      if (!map.has(key)) map.set(key, { ...rc, slug: rc.slug } as Category);
    }
    return Array.from(map.values());
  }, [categories]);

  const inr = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }),
    []
  );

  // Safe price formatter to avoid passing undefined to Intl.NumberFormat.format
  const formatPrice = (p?: number | string | null) =>
    p != null && p !== '' && !Number.isNaN(Number(p)) ? inr.format(Number(p)) : '—';

  // Helper: produce variants for a given concern/category slug
  const makeVariants = (basePath: string, slug: string) => {
    const clean = slug.toString().trim().toLowerCase().replace(/\s+/g, '-');
    return [
      `${basePath}/${clean}.jpeg`,
      `${basePath}/${clean}.jpg`,
      `${basePath}/${clean}.webp`,
      `${basePath}/${clean.replace(/-/g, '')}.jpeg`,
      `${basePath}/${clean.replace(/-/g, '')}.jpg`,
      `${basePath}/${clean.replace(/-/g, '')}.webp`,
    ];
  };

  // Generic onError handler that cycles through src variants stored in data-variants
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const el = e.currentTarget;
    try {
      const variantsRaw = el.dataset.variants;
      if (!variantsRaw) {
        el.src = el.dataset.fallback ?? '/assets/concerns/default.jpg';
        return;
      }
      const variants: string[] = JSON.parse(variantsRaw);
      const tried = Number(el.dataset.tried || '0');
      const nextIndex = tried + 1;
      if (nextIndex < variants.length) {
        el.dataset.tried = String(nextIndex);
        el.src = variants[nextIndex];
      } else {
        // exhausted variants -> fallback
        el.src = el.dataset.fallback ?? '/assets/concerns/default.jpg';
      }
    } catch (err) {
      el.src = el.dataset.fallback ?? '/assets/concerns/default.jpg';
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Local only — integrate with your API or service as needed.
    if (!newsletterEmail.trim()) return;
    console.log('Subscribe request for', newsletterEmail);
    setSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribed(false), 3500); // visual feedback
  };

  // cart snapshot from CartContext (fallback safe-read)
  const qtyFor = (p: Product) => cartItems[p.id] ?? 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* HERO */}
      <section className="relative">
        <div className="relative h-[500px] md:h-[560px] w-full overflow-hidden">
          <img
            src="/assets/hero/glass.jpeg"
            alt="Glass skin hero"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/28 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="text-white z-10 max-w-2xl py-12">
                  <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full shadow-sm mb-6">
                    <Sparkles className="w-4 h-4 text-rose-200" />
                    <span className="text-sm font-medium text-white/90">New Arrivals Available</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 leading-tight">
                    Discover the
                    <span className="block font-normal bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent">
                      Secret to Glass Skin
                    </span>
                  </h1>

                  <p className="text-lg text-white/90 mb-6">
                    Experience authentic Korean beauty with our curated collection of premium skincare.
                  </p>

                  {/* Buttons removed as requested */}
                </div>

                {/* Optional hero product image or promo card */}
                <div className="hidden md:block" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      {newProducts.length > 0 && (
        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-rose-600">New Arrivals</h2>
                <p className="text-sm text-gray-600 mt-2">Discover the latest innovations in K-beauty</p>
              </div>

              {/* UPDATED: toggle view all inline instead of navigating away */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllNew((s) => !s)}
                  className="text-sm font-medium text-rose-600"
                  aria-expanded={showAllNew}
                >
                  {showAllNew ? 'Show less' : `View all (${newProducts.length})`}
                </button>
                <button
                  onClick={() => onNavigate('new')}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  title="Go to New arrivals page"
                >
                  Open new page
                </button>
              </div>
            </div>

            {/* show either first 4 (collapsed) or all (expanded) */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all ${
                showAllNew ? 'duration-300' : ''
              }`}
            >
              {(showAllNew ? newProducts : newProducts.slice(0, 4)).map((product) => {
                const qty = qtyFor(product);
                const outOfStock = product.stock_quantity === 0;
                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-all transform hover:-translate-y-1 relative"
                  >
                    {qty > 0 && (
                      <div className="absolute top-3 left-3 z-20 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 text-rose-600">
                        {qty}
                      </div>
                    )}

                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {/* Wishlist heart button (CategoryPage style) */}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleWishlist(product);
                        }}
                        aria-pressed={isInWishlist(product.id)}
                        aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                        className={`absolute top-3 right-14 p-2 rounded-full shadow-sm transition-transform transform hover:scale-105 focus:outline-none ${
                          isInWishlist(product.id) ? 'bg-white' : 'bg-white'
                        }`}
                        title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'text-rose-600' : 'text-gray-600'}`} />
                      </button>

                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full bg-rose-500 text-white">
                        New
                      </div>
                      {outOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                            Out of stock
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 md:p-6">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.short_description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatPrice(product.price)}
                          </span>
                          {qty > 0 && <span className="text-sm text-gray-500">· {qty} in cart</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          {qty > 0 ? (
                            <>
                              <button
                                onClick={() => removeItem(product, 1)}
                                className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition"
                              >
                                −
                              </button>
                              <div className="px-3 py-1.5 rounded-full text-sm font-semibold bg-white border">
                                {qty}
                              </div>
                              <button
                                onClick={() => addItem(product, 1)}
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
                              onClick={() => addItem(product, 1)}
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
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop by Category</h2>
            <p className="text-gray-600">Find the perfect products for every step of your routine</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {displayedCategories.map((category) => {
              const slug = normalizeSlug(category.slug ?? category.name);
              const bare = slug.replace(/-/g, '');
              const imageSrc = CATEGORY_IMAGES[slug] ?? CATEGORY_IMAGES[bare] ?? CATEGORY_IMAGES.default;
              const name = category.name ?? slug;

              return (
                <button
                  key={category.id ?? slug}
                  onClick={() => onNavigate(`category-${slug}`)}
                  className="group aspect-square rounded-2xl overflow-hidden shadow hover:shadow-xl transition-all"
                >
                  <div className="relative h-full w-full">
                    <img
                      src={imageSrc}
                      alt={name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = CATEGORY_IMAGES.default;
                      }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <h3 className="text-sm font-medium text-white text-center px-2">{name}</h3>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONCERNS */}
      <section className="py-12 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop by Skin Concern</h2>
            <p className="text-gray-600">Find targeted solutions for common skin concerns</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {[
              { slug: 'acne-breakout', name: 'Acne & Breakouts' },
              { slug: 'pores', name: 'Pores' },
              { slug: 'dullness-tone', name: 'Dullness & Tone' },
              { slug: 'wrinkles', name: 'Wrinkles' },
              { slug: 'sensitive', name: 'Sensitive Skin' },
              { slug: 'dry-dehydrated', name: 'Dry & Dehydrated' },
            ].map((concern) => {
              const slug = normalizeSlug(concern.slug);
              const variants = makeVariants('/assets/concerns', slug);
              const first = variants[0];

              return (
                <button
                  key={concern.slug}
                  onClick={() => onNavigate(`concern-${concern.slug}`)}
                  className="group aspect-square rounded-2xl overflow-hidden shadow hover:shadow-xl transition-all"
                >
                  <div className="relative h-full w-full">
                    <img
                      src={first}
                      alt={concern.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      data-variants={JSON.stringify(variants)}
                      data-tried="0"
                      data-fallback="/assets/concerns/default.jpg"
                      onError={handleImageError}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/28 flex items-center justify-center">
                      <h3 className="text-sm font-medium text-white text-center px-2">{concern.name}</h3>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-gray-900 text-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand + short */}
            <div>
              <button
                onClick={() => onNavigate('home')}
                className="text-white text-xl font-semibold mb-3 inline-block"
                aria-label="Navigate to home"
              >
                Skinfinitys
              </button>
              <p className="text-sm text-gray-300">
                Curated Korean skincare, conscious ingredients, and simple routines for healthy, glowing skin.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => onNavigate('terms')}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Terms
                </button>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Privacy
                </button>
              </div>
            </div>

            {/* Shop sections */}
            <div>
              <h4 className="text-sm font-semibold text-gray-100 mb-3">Shop</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <button onClick={() => onNavigate('new')} className="hover:underline">
                    New Arrivals
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('category-cleanser')} className="hover:underline">
                    Cleansers
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('category-moisturizer')} className="hover:underline">
                    Moisturizers
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('category-sunscreen')} className="hover:underline">
                    Sunscreens
                  </button>
                </li>
              </ul>
            </div>

            {/* Customer care */}
            <div>
              <h4 className="text-sm font-semibold text-gray-100 mb-3">Customer Care</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <button onClick={() => onNavigate('help')} className="hover:underline">
                    Help & FAQs
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('shipping')} className="hover:underline">
                    Shipping
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('returns')} className="hover:underline">
                    Returns
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('contact')} className="hover:underline">
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* Newsletter & Social */}
            <div>
              <h4 className="text-sm font-semibold text-gray-100 mb-3">Join our newsletter</h4>
              <p className="text-sm text-gray-300 mb-3">Get 10% off your first order and updates on new drops.</p>

              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <label htmlFor="newsletter" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md px-3 py-2 text-gray-900 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition"
                >
                  Subscribe
                </button>
              </form>
              {subscribed && <p className="mt-2 text-sm text-emerald-300">Subscribed — thank you!</p>}

              <div className="mt-6">
                <h5 className="text-sm font-semibold text-gray-100 mb-2">Follow us</h5>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => window.open('https://instagram.com', '_blank')} aria-label="Instagram">
                  <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.3 2.3.5.6.3 1 .7 1.5 1.3.5.6.9.9 1.3 1.5.2.4.4 1.1.5 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.3 1.9-.5 2.3-.3.6-.7 1-1.3 1.5-.6.5-.9.9-1.5 1.3-.4.2-1.1.4-2.3.5-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.3-2.3-.5-.6-.3-1-.7-1.5-1.3-.5-.6-.9-.9-1.3-1.5-.2-.4-.4-1.1-.5-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.3-1.9.5-2.3.3-.6.7-1 1.3-1.5.6-.5.9-.9 1.5-1.3.4-.2 1.1-.4 2.3-.5C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7.1.1 5.9.2 4.9.4 4.1.7c-.9.4-1.7.9-2.6 1.8C.6 3.5.1 4.3-.3 5.2c-.3.8-.6 1.8-.7 3C-1.1 9.9-1.1 10.3-1.1 12s0 2.1.1 3.3c.1 1.2.4 2.2.7 3 .4.9.9 1.7 1.8 2.6.9.9 1.7 1.4 2.6 1.8.8.3 1.8.6 3 .7 1.2.1 1.6.1 3.3.1s2.1 0 3.3-.1c1.2-.1 2.2-.4 3-.7.9-.4 1.7-.9 2.6-1.8.9-.9 1.4-1.7 1.8-2.6.3-.8.6-1.8.7-3 .1-1.2.1-1.6.1-3.3s0-2.1-.1-3.3c-.1-1.2-.4-2.2-.7-3-.4-.9-.9-1.7-1.8-2.6C20.9.9 20.1.4 19.2.1c-.8-.3-1.8-.6-3-.7C14.1 0 13.7 0 12 0z" />
                    <path d="M12 5.8A6.2 6.2 0 1 0 12 18.2 6.2 6.2 0 1 0 12 5.8zm0 10.2A4 4 0 1 1 12 7.8a4 4 0 0 1 0 8.2zM18.4 4.6a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
                  </svg>
                </button>
                <button onClick={() => window.open('https://facebook.com', '_blank')} aria-label="Facebook">
                  <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12.07C22 6.49 17.52 2 12 2S2 6.49 2 12.07c0 4.98 3.66 9.11 8.44 9.93v-7.03H7.9v-2.9h2.54V9.41c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.23 0-1.61.77-1.61 1.56v1.87h2.75l-.44 2.9h-2.31V22C18.34 21.18 22 17.05 22 12.07z" />
                  </svg>
                </button>
                <button onClick={() => window.open('mailto:hello@example.com')} aria-label="Email">
                  <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-6 text-sm text-gray-400 flex flex-col md:flex-row items-center justify-between">
              <div>© {new Date().getFullYear()} Skinfinitys. All rights reserved.</div>
              <div className="mt-3 md:mt-0">Made with ❤️ · Ships across India</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
