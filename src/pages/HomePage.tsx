// src/pages/HomePage.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Truck, Undo2 } from 'lucide-react';
import ProductCard, { ProductGrid } from '../components/ProductCard';
import { Button, Spinner } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useNavigate } from '../hooks/useRoute';
import {
  CATEGORY_PLACEHOLDER,
  CONCERN_PLACEHOLDER,
  HERO_IMAGE,
  categoryImage,
  concernImage,
  fallbackTo,
} from '../lib/images';
import { dedupeKey } from '../lib/format';
import {
  fetchFeaturedProducts,
  fetchNewArrivals,
  isSupabaseConfigured,
  type Product,
} from '../lib/supabase';

const TRUST_POINTS = [
  { icon: ShieldCheck, title: '100% authentic', copy: 'Sourced direct from Korean brands' },
  { icon: Truck, title: 'Free shipping', copy: 'On orders over ₹1,499 across India' },
  { icon: Leaf, title: 'Conscious picks', copy: 'Cruelty-free and dermatologist tested' },
  { icon: Undo2, title: 'Easy returns', copy: '7-day no-questions returns' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { categories, concerns, loading: catalogLoading } = useCatalog();

  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      // No early return for a missing Supabase config: the data layer serves the
      // bundled demo catalogue in that case, so the page still has products.
      setLoading(true);
      try {
        const [fresh, popular] = await Promise.all([fetchNewArrivals(12), fetchFeaturedProducts(8)]);
        if (!active) return;
        setNewArrivals(fresh);
        // Avoid repeating the same products in both rails.
        const seen = new Set(fresh.map((p) => p.id));
        setFeatured(popular.filter((p) => !seen.has(p.id)));
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load products.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const shopCategories = categories.filter((c) => dedupeKey(c.slug ?? c.name) !== 'new');

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          onError={fallbackTo('/assets/hero/glass-skin.webp')}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />

        <div className="mx-auto flex min-h-[520px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 md:min-h-[600px]">
          <div className="max-w-xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur">
              <Sparkles className="h-4 w-4 text-rose-200" />
              New K-beauty arrivals every week
            </span>

            <h1 className="mt-6 text-4xl font-light leading-tight sm:text-5xl md:text-6xl">
              Discover the secret to
              <span className="mt-1 block bg-gradient-to-r from-rose-200 to-pink-100 bg-clip-text font-normal text-transparent">
                glass skin
              </span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
              Authentic Korean skincare, curated by concern and routine step. Find the formulas your
              skin actually needs — no ten-step guesswork required.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('new')}>
                Shop new arrivals <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                onClick={() => {
                  const first = concerns[0]?.slug ?? concerns[0]?.name;
                  if (first) navigate(`concern-${first}`);
                  else document.getElementById('concerns')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Shop by concern
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- trust bar */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {TRUST_POINTS.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="rounded-full bg-rose-50 p-2 text-rose-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------- new arrivals */}
      <section className="bg-gray-50/70 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Just landed"
            title="New arrivals"
            copy="The latest innovations from Seoul, restocked weekly."
            action={
              newArrivals.length > 0 ? (
                <Button variant="ghost" onClick={() => navigate('new')}>
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              ) : undefined
            }
          />

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Loading new arrivals" />
            </div>
          ) : newArrivals.length === 0 ? (
            <EmptyCatalogue error={error} />
          ) : (
            <ProductGrid>
              {newArrivals.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ bestsellers */}
      {featured.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Loved by our community"
              title="Bestsellers"
              copy="The routines our customers keep coming back to."
            />
            <ProductGrid>
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ categories */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Build your routine"
            title="Shop by category"
            copy="Every step, from first cleanse to SPF."
          />

          {catalogLoading ? (
            <div className="flex justify-center py-12">
              <Spinner label="Loading categories" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {shopCategories.map((category) => {
                const slug = category.slug ?? category.name;
                return (
                  <Tile
                    key={category.id}
                    label={category.name}
                    image={categoryImage(slug)}
                    fallback={CATEGORY_PLACEHOLDER}
                    onClick={() => navigate(`category-${slug}`)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- concerns */}
      <section id="concerns" className="scroll-mt-24 bg-neutral-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Targeted care"
            title="Shop by skin concern"
            copy="Tell us what your skin is doing and we will match the formulas."
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {concerns.map((concern) => {
              const slug = concern.slug ?? concern.name;
              return (
                <Tile
                  key={concern.id}
                  label={concern.name}
                  image={concernImage(slug)}
                  fallback={CONCERN_PLACEHOLDER}
                  onClick={() => navigate(`concern-${slug}`)}
                />
              );
            })}
          </div>

          {!catalogLoading && concerns.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              Skin concerns are unavailable right now. Please check back shortly.
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- quiz */}
      <section className="bg-gradient-to-br from-rose-600 to-pink-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:flex-row lg:justify-between lg:text-left lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-2xl font-light sm:text-3xl">Not sure where to start?</h2>
            <p className="mt-2 text-sm text-white/85 sm:text-base">
              Set your skin type in your profile and we will tailor recommendations, from barrier
              repair to brightening.
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="border-transparent bg-white text-rose-700 hover:bg-rose-50"
            onClick={() => navigate('profile')}
          >
            Set up my skin profile
          </Button>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
        {copy && <p className="mt-2 max-w-xl text-sm text-gray-600">{copy}</p>}
      </div>
      {action}
    </div>
  );
}

function Tile({
  label,
  image,
  fallback,
  onClick,
}: {
  label: string;
  image: string;
  fallback: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-2xl shadow-sm transition hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <img
        src={image}
        alt={label}
        loading="lazy"
        onError={fallbackTo(fallback)}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-3 text-left text-sm font-medium text-white">
        {label}
      </span>
    </button>
  );
}

/** Shared empty/error state for catalogue-driven sections. */
export function EmptyCatalogue({ error }: { error?: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold text-gray-900">No products to show yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        {error ??
          (isSupabaseConfigured
            ? 'Seed the products table with the migration in supabase/migrations to populate the storefront.'
            : 'Connect Supabase to load the catalogue. See the setup guide for the required environment variables.')}
      </p>
    </div>
  );
}

