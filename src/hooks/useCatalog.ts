// src/hooks/useCatalog.ts
// Categories and skin concerns are near-static reference data. Load them once
// per session and share the result between the navbar, footer and pages.
import { useEffect, useState } from 'react';
import { fetchCategories, fetchConcerns, type Category, type SkinConcern } from '../lib/supabase';

export type Catalog = {
  categories: Category[];
  concerns: SkinConcern[];
  loading: boolean;
  error: string | null;
};

let cache: { categories: Category[]; concerns: SkinConcern[] } | null = null;
let inflight: Promise<{ categories: Category[]; concerns: SkinConcern[] }> | null = null;

async function load() {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    // Load independently: a failure in one list should not blank the other.
    const [categoriesResult, concernsResult] = await Promise.allSettled([fetchCategories(), fetchConcerns()]);
    const value = {
      categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
      concerns: concernsResult.status === 'fulfilled' ? concernsResult.value : [],
    };
    cache = value;
    inflight = null;
    return value;
  })();

  return inflight;
}

/** Invalidate the cached catalogue (used after admin-style mutations). */
export function invalidateCatalog() {
  cache = null;
}

export function useCatalog(): Catalog {
  const [state, setState] = useState<Catalog>({
    categories: cache?.categories ?? [],
    concerns: cache?.concerns ?? [],
    loading: !cache,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const apply = (value: { categories: Category[]; concerns: SkinConcern[] }) => {
      if (!active) return;
      setState({ categories: value.categories, concerns: value.concerns, loading: false, error: null });
    };

    if (cache) {
      apply(cache);
      return () => {
        active = false;
      };
    }

    load()
      .then(apply)
      .catch((err: unknown) => {
        if (!active) return;
        setState({
          categories: [],
          concerns: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Could not load catalogue',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
