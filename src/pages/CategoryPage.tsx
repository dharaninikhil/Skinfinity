// src/pages/CategoryPage.tsx
import { useCallback } from 'react';
import CollectionGrid, { type CollectionResult } from '../components/CollectionGrid';
import { fetchProductsByCategorySlug, type ProductSort } from '../lib/supabase';

type CategoryPageProps = {
  categorySlug: string;
};

export default function CategoryPage({ categorySlug }: CategoryPageProps) {
  const load = useCallback(
    async (sort: ProductSort): Promise<CollectionResult> => {
      const { category, products } = await fetchProductsByCategorySlug(categorySlug, sort);
      return {
        heading: category?.name ?? categorySlug.replace(/-/g, ' '),
        description: category?.description ?? null,
        products,
      };
    },
    [categorySlug]
  );

  return (
    <CollectionGrid
      eyebrow="Category"
      reloadKey={categorySlug}
      load={load}
      breadcrumbs={[
        { label: 'Home', to: 'home' },
        { label: 'Shop', to: 'new' },
        { label: categorySlug.replace(/-/g, ' ') },
      ]}
      emptyMessage="This category has no products yet. Try another category or browse new arrivals."
    />
  );
}
