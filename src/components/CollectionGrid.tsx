// src/components/CollectionGrid.tsx
//
// Shared listing shell for category, concern, new-arrivals and search pages.
// Centralising it means sorting, loading, error and empty states behave the
// same everywhere — they had diverged across the three original pages.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, PackageOpen, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from '../hooks/useRoute';
import type { Product, ProductSort } from '../lib/supabase';
import ProductCard, { ProductGrid } from './ProductCard';
import { Button, EmptyState, Spinner } from './ui';

export type CollectionResult = {
  heading: string;
  description?: string | null;
  products: Product[];
};

export type Crumb = { label: string; to?: string };

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

type CollectionGridProps = {
  eyebrow?: string;
  /** Fetches the heading, description and products for the given sort. */
  load: (sort: ProductSort) => Promise<CollectionResult>;
  /** Changing this (e.g. a different slug) re-runs the fetch. */
  reloadKey: string;
  emptyMessage?: string;
  breadcrumbs?: Crumb[];
  /** Rendered above the grid — hero image, tips, etc. */
  headerAside?: ReactNode;
};

export default function CollectionGrid({
  eyebrow,
  load,
  reloadKey,
  emptyMessage = 'Nothing here yet — check back soon.',
  breadcrumbs = [{ label: 'Home', to: 'home' }],
  headerAside,
}: CollectionGridProps) {
  const navigate = useNavigate();

  const [sort, setSort] = useState<ProductSort>('newest');
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (nextSort: ProductSort) => {
      setLoading(true);
      setError(null);
      try {
        setResult(await load(nextSort));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load products.');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  useEffect(() => {
    void run(sort);
    // `sort` intentionally excluded: changing it is handled by the select below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const products = result?.products ?? [];
  const heading = result?.heading ?? '';

  return (
    <div className="bg-white">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="border-b border-gray-100 bg-gray-50/60">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-3 text-xs text-gray-500 sm:px-6 lg:px-8">
          {breadcrumbs.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {crumb.to ? (
                <button
                  type="button"
                  onClick={() => navigate(crumb.to as string)}
                  className="transition hover:text-rose-600 focus:outline-none focus-visible:underline"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="font-medium text-gray-700">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">{eyebrow}</p>
            )}
            <h1 className="mt-1 text-3xl font-bold capitalize text-gray-900 sm:text-4xl">
              {heading || 'Loading…'}
            </h1>
            {result?.description && <p className="mt-3 text-gray-600">{result.description}</p>}
            {!loading && !error && (
              <p className="mt-3 text-sm text-gray-500">
                {products.length} product{products.length === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {headerAside}

          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="collection-sort"
                className="flex items-center gap-1.5 text-sm text-gray-500"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Sort
              </label>
              <select
                id="collection-sort"
                value={sort}
                onChange={(event) => {
                  const next = event.target.value as ProductSort;
                  setSort(next);
                  void run(next);
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Loading products" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<PackageOpen className="h-10 w-10" />}
            title="We could not load these products"
            description={error}
            action={
              <Button variant="secondary" onClick={() => void run(sort)}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            }
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-10 w-10" />}
            title="No products found"
            description={emptyMessage}
            action={<Button onClick={() => navigate('home')}>Browse the storefront</Button>}
          />
        ) : (
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </div>
    </div>
  );
}
