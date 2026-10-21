// src/pages/NewArrivalsPage.tsx
import { useCallback } from 'react';
import CollectionGrid, { type CollectionResult } from '../components/CollectionGrid';
import { toNumber } from '../lib/format';
import { fetchNewArrivals, type Product, type ProductSort } from '../lib/supabase';

/**
 * `is_new` products are fetched newest-first. The remaining sort options are
 * applied client-side so one query shape covers every sort.
 */
function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const copy = [...products];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => toNumber(a.price) - toNumber(b.price));
    case 'price_desc':
      return copy.sort((a, b) => toNumber(b.price) - toNumber(a.price));
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
    default:
      return copy;
  }
}

export default function NewArrivalsPage() {
  const load = useCallback(async (sort: ProductSort): Promise<CollectionResult> => {
    const products = await fetchNewArrivals(60);
    return {
      heading: 'New arrivals',
      description: 'The latest K-beauty launches, added to the shelf every week.',
      products: sortProducts(products, sort),
    };
  }, []);

  return (
    <CollectionGrid
      eyebrow="Just landed"
      reloadKey="new-arrivals"
      load={load}
      breadcrumbs={[{ label: 'Home', to: 'home' }, { label: 'New arrivals' }]}
      emptyMessage="No new products right now — the next drop is on its way."
    />
  );
}
