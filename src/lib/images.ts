// src/lib/images.ts
// Every image in the storefront is resolved through here so that missing files
// degrade to a branded placeholder instead of a broken-image icon.

import type { SyntheticEvent } from 'react';
import type { Product } from './supabase';

export const PRODUCT_PLACEHOLDER = '/assets/products/placeholder.svg';
export const CATEGORY_PLACEHOLDER = '/assets/categories/default.svg';
export const CONCERN_PLACEHOLDER = '/assets/concerns/default.svg';

/** Hero image used on the home page. */
export const HERO_IMAGE = '/assets/hero/glass.jpeg';

/**
 * Category tiles keyed by slug. Both hyphenated and bare spellings are
 * registered because seed data and asset filenames have drifted apart
 * (`lip-care` in the database vs `lipcare.jpeg` on disk).
 */
const CATEGORY_IMAGES: Record<string, string> = {
  new: '/assets/categories/new.jpeg',
  cleanser: '/assets/categories/cleanser.jpeg',
  cleansers: '/assets/categories/cleanser.jpeg',
  toner: '/assets/categories/toner.jpeg',
  'ampoule-serum': '/assets/categories/ampoule-serum.jpeg',
  ampouleserum: '/assets/categories/ampoule-serum.jpeg',
  serum: '/assets/categories/ampoule-serum.jpeg',
  moisturizer: '/assets/categories/moisturizer.jpeg',
  moisturiser: '/assets/categories/moisturizer.jpeg',
  'mask-treatment': '/assets/categories/mask-treatment.jpeg',
  masktreatment: '/assets/categories/mask-treatment.jpeg',
  sunscreen: '/assets/categories/sunscreen.webp',
  'lip-care': '/assets/categories/lipcare.jpeg',
  lipcare: '/assets/categories/lipcare.jpeg',
  sets: '/assets/categories/sets.webp',
  merchandise: '/assets/categories/merchandise.webp',
};

const CONCERN_IMAGES: Record<string, string> = {
  'acne-breakout': '/assets/concerns/acne-breakout.jpeg',
  acnebreakout: '/assets/concerns/acne-breakout.jpeg',
  acne: '/assets/concerns/acne-breakout.jpeg',
  pores: '/assets/concerns/pores.jpeg',
  'dullness-tone': '/assets/concerns/dullness-tone.jpeg',
  dullnesstone: '/assets/concerns/dullness-tone.jpeg',
  dullness: '/assets/concerns/dullness-tone.jpeg',
  wrinkles: '/assets/concerns/wrinkles.jpeg',
  'sensitive-skin': '/assets/concerns/sensitive.jpeg',
  sensitive: '/assets/concerns/sensitive.jpeg',
  'dry-dehydrated': '/assets/concerns/dry-dehydrated.jpeg',
  drydehydrated: '/assets/concerns/dry-dehydrated.jpeg',
  dry: '/assets/concerns/dry-dehydrated.jpeg',
};

function lookup(map: Record<string, string>, slug?: string | null, fallback = ''): string {
  if (!slug) return fallback;
  const base = slug.toString().trim().toLowerCase().replace(/\s+/g, '-');
  const bare = base.replace(/-/g, '');
  return map[base] ?? map[bare] ?? fallback;
}

export function categoryImage(slug?: string | null): string {
  return lookup(CATEGORY_IMAGES, slug, CATEGORY_PLACEHOLDER);
}

export function concernImage(slug?: string | null): string {
  return lookup(CONCERN_IMAGES, slug, CONCERN_PLACEHOLDER);
}

/**
 * Product image. Historically images were derived from the product id under
 * `/assets/new/{id}.jpg`; that directory does not exist, so unknown products
 * fall back to the branded placeholder.
 */
export function productImage(product?: Pick<Product, 'image_url' | 'id'> | null): string {
  const url = product?.image_url?.trim();
  if (url) return url;
  return PRODUCT_PLACEHOLDER;
}

/**
 * `onError` handler that swaps to a placeholder exactly once. Guarded with a
 * data attribute so a failing placeholder cannot loop forever.
 */
export function fallbackTo(fallbackSrc: string) {
  return (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const el = event.currentTarget;
    if (el.dataset.fallbackApplied === 'true') return;
    el.dataset.fallbackApplied = 'true';
    el.src = fallbackSrc;
  };
}
