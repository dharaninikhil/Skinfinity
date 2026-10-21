import { describe, expect, it } from 'vitest';
import { availableStock, discountPercent, isLowStock, isOutOfStock, isPurchasable, productPath } from './products';
import type { Product } from './supabase';

describe('productPath', () => {
  it('prefers the slug for readable URLs', () => {
    expect(productPath({ id: 'abc', slug: 'snail-mucin-92' })).toBe('/product/snail-mucin-92');
  });

  it('falls back to the id when no slug was set', () => {
    expect(productPath({ id: 'abc', slug: null })).toBe('/product/abc');
    expect(productPath({ id: 'abc', slug: '' })).toBe('/product/abc');
  });

  it('encodes slugs that need it', () => {
    expect(productPath({ id: 'x', slug: 'a b/c' })).toBe('/product/a%20b%2Fc');
  });
});

describe('stock helpers', () => {
  const withStock = (stock: number | null): Product => ({ id: 'p', name: 'p', stock_quantity: stock });

  it('treats null stock as untracked rather than sold out', () => {
    expect(availableStock(withStock(null))).toBeNull();
    expect(isOutOfStock(withStock(null))).toBe(false);
    expect(isPurchasable(withStock(null))).toBe(true);
  });

  it('detects sold-out products', () => {
    expect(isOutOfStock(withStock(0))).toBe(true);
    expect(isPurchasable(withStock(0))).toBe(false);
  });

  it('flags low stock within the threshold only', () => {
    expect(isLowStock(withStock(5))).toBe(true);
    expect(isLowStock(withStock(6))).toBe(false);
    expect(isLowStock(withStock(0))).toBe(false);
    expect(isLowStock(withStock(null))).toBe(false);
    expect(isLowStock(withStock(3), 2)).toBe(false);
  });

  it('coerces string stock counts from the database', () => {
    expect(availableStock({ id: 'p', name: 'p', stock_quantity: '4' } as unknown as Product)).toBe(4);
  });
});

describe('discountPercent', () => {
  it('rounds the percentage off', () => {
    expect(discountPercent(800, 1000)).toBe(20);
    expect(discountPercent('1150', '1450')).toBe(21);
  });

  it('returns null when there is no real discount', () => {
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1200, 1000)).toBeNull();
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(0, 1000)).toBeNull();
  });
});
