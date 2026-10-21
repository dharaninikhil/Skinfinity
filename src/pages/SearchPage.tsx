// src/pages/SearchPage.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import ProductCard, { ProductGrid } from '../components/ProductCard';
import { Button, EmptyState, Spinner } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useNavigate } from '../hooks/useRoute';
import { searchProducts, type Product } from '../lib/supabase';

const POPULAR_SEARCHES = ['sunscreen', 'snail mucin', 'vitamin c', 'toner', 'acne', 'sheet mask'];
const DEBOUNCE_MS = 350;

export default function SearchPage({ initialQuery = '' }: { initialQuery?: string }) {
  const navigate = useNavigate();
  const { categories } = useCatalog();

  const [term, setTerm] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialQuery);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep the field in sync when the URL query changes (e.g. browser back).
  useEffect(() => {
    setTerm(initialQuery);
    setSubmitted(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!inputRef.current) return;
    if (!initialQuery) inputRef.current.focus();
  }, [initialQuery]);

  const runSearch = useMemo(
    () => async (query: string) => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { products, total: count } = await searchProducts(q);
        setResults(products);
        setTotal(count);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.');
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced live search as the shopper types.
  useEffect(() => {
    const handle = setTimeout(() => {
      void runSearch(term);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, runSearch]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    setSubmitted(q);
    // Reflect the query in the URL so results are shareable and back works.
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { keepScroll: true });
    void runSearch(q);
  };

  const searchFor = (value: string) => {
    setTerm(value);
    setSubmitted(value);
    navigate(`/search?q=${encodeURIComponent(value)}`, { keepScroll: true });
  };

  return (
    <div className="bg-white">
      <div className="border-b border-gray-100 bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Search</h1>

          <form onSubmit={submit} className="mt-5 max-w-2xl" role="search">
            <label htmlFor="search-page-input" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="search-page-input"
                ref={inputRef}
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search by name, ingredient or concern…"
                className="w-full rounded-full border border-gray-200 bg-white py-3.5 pl-12 pr-28 text-sm shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <Button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2">
                Search
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Popular</span>
            {POPULAR_SEARCHES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => searchFor(suggestion)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 transition hover:border-rose-300 hover:text-rose-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Searching products" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<SearchX className="h-10 w-10" />}
            title="Search is unavailable"
            description={error}
            action={<Button variant="secondary" onClick={() => void runSearch(term)}>Try again</Button>}
          />
        ) : !submitted.trim() ? (
          <BrowsePrompt onPick={(slug) => navigate(`category-${slug}`)} categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug ?? c.name }))} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-10 w-10" />}
            title={`No results for “${submitted}”`}
            description="Check the spelling, try a broader term, or browse a category instead."
            action={<Button onClick={() => navigate('new')}>See new arrivals</Button>}
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              {total} result{total === 1 ? '' : 's'} for <span className="font-medium text-gray-800">“{submitted}”</span>
            </p>
            <ProductGrid>
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </>
        )}
      </div>
    </div>
  );
}

function BrowsePrompt({
  categories,
  onPick,
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  onPick: (slug: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Browse the catalogue</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onPick(category.slug)}
            className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
          >
            {category.name}
          </button>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-gray-500">Categories are unavailable right now.</p>
        )}
      </div>
    </div>
  );
}
