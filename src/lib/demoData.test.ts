import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEMO_CATEGORIES, DEMO_CONCERNS, DEMO_PRODUCTS } from './demoData';
import { demoProductBySlug, demoProductsByCategorySlug, demoProductsByConcernSlug, demoResolveCategory, demoResolveConcern, demoSearch } from './demoApi';
import { toNumber } from './format';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const seedSql = readFileSync(join(repoRoot, 'supabase/migrations/20251116150400_seed_products.sql'), 'utf8');

describe('demo catalogue integrity', () => {
  it('has usable reference data', () => {
    expect(DEMO_CATEGORIES.length).toBeGreaterThan(5);
    expect(DEMO_CONCERNS.length).toBeGreaterThan(3);
    expect(DEMO_PRODUCTS.length).toBeGreaterThan(10);
  });

  it('uses unique product slugs and ids', () => {
    const slugs = DEMO_PRODUCTS.map((p) => p.slug);
    const ids = DEMO_PRODUCTS.map((p) => p.id);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every product at a category that exists', () => {
    const categoryIds = new Set(DEMO_CATEGORIES.map((c) => c.id));
    for (const product of DEMO_PRODUCTS) {
      expect(categoryIds.has(product.category_id as string), `${product.slug ?? '?'} -> ${product.category_id}`).toBe(true);
      expect(product.category?.id).toBe(product.category_id);
    }
  });

  it('points every concern chip at a concern that exists', () => {
    const concernIds = new Set(DEMO_CONCERNS.map((c) => c.id));
    for (const product of DEMO_PRODUCTS) {
      for (const concern of product.concerns ?? []) {
        expect(concernIds.has(concern.id), `${product.slug ?? '?'} -> ${concern.id}`).toBe(true);
      }
    }
  });

  it('has sane pricing and stock', () => {
    for (const product of DEMO_PRODUCTS) {
      expect(toNumber(product.price), product.slug ?? '?').toBeGreaterThan(0);
      expect(toNumber(product.stock_quantity), product.slug ?? '?').toBeGreaterThanOrEqual(0);
      const compareAt = product.compare_at_price;
      if (compareAt !== null && compareAt !== undefined) {
        expect(toNumber(compareAt), product.slug ?? '?').toBeGreaterThan(toNumber(product.price));
      }
    }
  });

  it('stocks every shoppable category so no page renders empty', () => {
    for (const category of DEMO_CATEGORIES) {
      if (category.slug === 'new') continue; // "New" is a flag, not a category
      const { products } = demoProductsByCategorySlug(category.slug as string);
      expect(products.length, category.slug ?? '?').toBeGreaterThan(0);
    }
  });

  it('maps every concern to at least one product', () => {
    for (const concern of DEMO_CONCERNS) {
      const { products } = demoProductsByConcernSlug(concern.slug as string);
      expect(products.length, concern.slug ?? '?').toBeGreaterThan(0);
    }
  });
});

describe('demo catalogue stays in sync with the SQL seed', () => {
  it('includes every slug seeded by the migration', () => {
    for (const product of DEMO_PRODUCTS) {
      expect(seedSql, product.slug ?? '?').toContain(`'${product.slug}'`);
    }
  });

  it('does not contain products that were removed from the migration', () => {
    // Only the `WITH seed(...)` block; the concern mapping CTE has the same shape.
    const seedBlock = seedSql.slice(
      seedSql.indexOf('WITH seed('),
      seedSql.indexOf('INSERT INTO products')
    );
    const seeded = [...seedBlock.matchAll(/\(\s*'([^']+)',\s*'([a-z0-9][a-z0-9-]*)',/g)].map((m) => m[2]);

    expect(seeded.length).toBe(DEMO_PRODUCTS.length);
    for (const slug of seeded) {
      expect(DEMO_PRODUCTS.some((p) => p.slug === slug), slug).toBe(true);
    }
  });
});

describe('demo queries', () => {
  it('finds a product by slug', () => {
    expect(demoProductBySlug('snail-mucin-92-repair-ampoule')?.name).toMatch(/Snail Mucin/);
  });

  it('resolves slug aliases the way the UI relies on', () => {
    expect(demoResolveCategory('lip-care')?.slug).toBe('lipcare');
    expect(demoResolveCategory('lipcare')?.slug).toBe('lipcare');
    expect(demoResolveConcern('sensitive-skin')?.slug).toBe('sensitive');
    expect(demoResolveConcern('sensitive')?.slug).toBe('sensitive');
  });

  it('returns nothing for an unknown slug rather than throwing', () => {
    expect(demoResolveCategory('does-not-exist')).toBeNull();
    expect(demoProductBySlug('does-not-exist')).toBeNull();
  });

  it('searches name, description and ingredients', () => {
    expect(demoSearch('niacinamide').total).toBeGreaterThan(0);
    expect(demoSearch('SNAIL').total).toBeGreaterThan(0);
    expect(demoSearch('zzzz-no-match').total).toBe(0);
    expect(demoSearch('   ').products).toEqual([]);
  });

  it('sorts by price on request', () => {
    const { products } = demoProductsByCategorySlug('ampoule-serum', 'price_asc');
    const prices = products.map((p) => toNumber(p.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
