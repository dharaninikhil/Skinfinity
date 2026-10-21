// src/pages/ConcernPage.tsx
import { useCallback } from 'react';
import CollectionGrid, { type CollectionResult } from '../components/CollectionGrid';
import { fetchProductsByConcernSlug, type ProductSort } from '../lib/supabase';

type ConcernPageProps = {
  concernSlug: string;
};

export default function ConcernPage({ concernSlug }: ConcernPageProps) {
  const load = useCallback(
    async (sort: ProductSort): Promise<CollectionResult> => {
      const { concern, products } = await fetchProductsByConcernSlug(concernSlug, sort);
      return {
        heading: concern?.name ?? concernSlug.replace(/-/g, ' '),
        description: concern?.description ?? null,
        products,
      };
    },
    [concernSlug]
  );

  return (
    <CollectionGrid
      eyebrow="Skin concern"
      reloadKey={concernSlug}
      load={load}
      breadcrumbs={[{ label: 'Home', to: 'home' }, { label: concernSlug.replace(/-/g, ' ') }]}
      emptyMessage="No products are mapped to this concern yet. Browse by category instead."
    />
  );
}
