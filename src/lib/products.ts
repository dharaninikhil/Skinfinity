// src/lib/products.ts
// Product-derived helpers shared by cards, the cart and the PDP.
import { toNumber } from './format';
import type { Product } from './supabase';

/** Canonical storefront path for a product. Falls back to the id when no slug is set. */
export function productPath(product: Pick<Product, 'id' | 'slug'>): string {
  return `/product/${encodeURIComponent(product.slug || product.id)}`;
}

/** Known remaining stock, or null when the catalogue does not track it. */
export function availableStock(product?: Pick<Product, 'stock_quantity'> | null): number | null {
  const stock = product?.stock_quantity;
  return stock === null || stock === undefined ? null : toNumber(stock);
}

export function isOutOfStock(product?: Pick<Product, 'stock_quantity'> | null): boolean {
  const stock = availableStock(product);
  return stock !== null && stock <= 0;
}

/** A shopper can add this product to their cart right now. */
export function isPurchasable(product?: Pick<Product, 'stock_quantity'> | null): boolean {
  return !isOutOfStock(product);
}

/** True when stock is tracked and running low (used for urgency hints). */
export function isLowStock(product?: Pick<Product, 'stock_quantity'> | null, threshold = 5): boolean {
  const stock = availableStock(product);
  return stock !== null && stock > 0 && stock <= threshold;
}

/** Percentage off against a compare-at price, or null when not discounted. */
export function discountPercent(
  price?: number | string | null,
  compareAt?: number | string | null
): number | null {
  const current = toNumber(price);
  const was = toNumber(compareAt);
  if (!current || !was || was <= current) return null;
  return Math.round(((was - current) / was) * 100);
}
