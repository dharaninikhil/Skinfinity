#!/usr/bin/env node
/**
 * Generates src/lib/demoData.ts from the product seed migration so the offline
 * demo catalogue and the seeded database can never drift apart.
 *
 *   node scripts/generate-demo-data.mjs
 *
 * Dependency-free on purpose: it parses the two `WITH … AS (VALUES …)` blocks of
 * supabase/migrations/20251116150400_seed_products.sql.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SEED_FILE = join(root, 'supabase/migrations/20251116150400_seed_products.sql');
const OUT_FILE = join(root, 'src/lib/demoData.ts');

/** Categories and concerns, mirroring the base migration plus the slug
 *  normalisation applied in 20251116150000_extend_catalogue_columns.sql. */
const CATEGORIES = [
  ['New', 'new', 'Latest arrivals in K-beauty', 1],
  ['Cleanser', 'cleanser', 'Double cleanse your way to clear skin', 2],
  ['Toner', 'toner', 'Balance and hydrate your skin', 3],
  ['Ampoule & Serum', 'ampoule-serum', 'Concentrated treatments for targeted concerns', 4],
  ['Moisturizer', 'moisturizer', 'Lock in hydration and protect your skin', 5],
  ['Mask & Treatment', 'mask-treatment', 'Weekly treats for glowing skin', 6],
  ['Sunscreen', 'sunscreen', 'Essential daily protection', 7],
  ['Lip Care', 'lipcare', 'Nourish and protect your lips', 8],
  ['Sets', 'sets', 'Curated skincare routines', 9],
  ['Merchandise', 'merchandise', 'Tools and accessories', 10],
];

const CONCERNS = [
  ['Acne & Breakout', 'acne-breakout', 'Combat blemishes and prevent future breakouts', 1],
  ['Pores', 'pores', 'Minimize and refine enlarged pores', 2],
  ['Dullness & Tone', 'dullness-tone', 'Brighten and even out skin tone', 3],
  ['Wrinkles', 'wrinkles', 'Reduce fine lines and improve elasticity', 4],
  ['Sensitive Skin', 'sensitive', 'Gentle care for reactive skin', 5],
  ['Dry & Dehydrated Skin', 'dry-dehydrated', 'Intense hydration and moisture barrier repair', 6],
];

/* ------------------------------------------------------------------ parsing */

/** Split a tuple body on top-level commas, ignoring separators inside quotes. */
function splitTopLevel(text) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      current += char;
      if (char === "'") {
        if (text[i + 1] === "'") {
          current += "'";
          i += 1;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Collect every top-level `( … )` tuple in a block of SQL. */
function parseTuples(block) {
  const tuples = [];
  let i = 0;

  while (i < block.length) {
    if (block[i] !== '(') {
      i += 1;
      continue;
    }
    let depth = 0;
    let inString = false;
    let start = i;

    for (; i < block.length; i += 1) {
      const char = block[i];
      if (inString) {
        if (char === "'") {
          if (block[i + 1] === "'") i += 1;
          else inString = false;
        }
        continue;
      }
      if (char === "'") {
        inString = true;
        continue;
      }
      if (char === '(') {
        depth += 1;
        if (depth === 1) start = i;
        continue;
      }
      if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          tuples.push(block.slice(start + 1, i));
          break;
        }
      }
    }
    i += 1;
  }

  return tuples;
}

function parseValue(raw) {
  const text = raw.trim();
  if (/^null$/i.test(text)) return null;
  if (/^true$/i.test(text)) return true;
  if (/^false$/i.test(text)) return false;
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+$/.test(text)) return Number.parseInt(text, 10);
  if (/^-?\d*\.\d+$/.test(text)) return Number.parseFloat(text);
  throw new Error(`Unsupported seed value: ${text}`);
}

/** Extract `{ columns, rows }` for a `WITH <name>(cols) AS (VALUES …)` CTE. */
function extractCte(sql, name) {
  const re = new RegExp(`WITH\\s+${name}\\s*\\(([^)]*)\\)\\s*AS\\s*\\(\\s*VALUES`, 'i');
  const match = re.exec(sql);
  if (!match) throw new Error(`Could not find CTE "${name}" in the seed migration.`);

  const columns = match[1].split(',').map((c) => c.trim());
  const rest = sql.slice(match.index + match[0].length);
  const end = rest.search(/\)\s*\nINSERT INTO/i);
  if (end < 0) throw new Error(`Could not find the end of CTE "${name}".`);

  const rows = parseTuples(rest.slice(0, end)).map((tuple) => {
    const values = splitTopLevel(tuple).map(parseValue);
    if (values.length !== columns.length) {
      throw new Error(`Row has ${values.length} values but ${columns.length} columns were declared.`);
    }
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });

  return { columns, rows };
}

/* ------------------------------------------------------------------ output */

const tsValue = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
};

const field = (key, value, indent) => `${indent}${key}: ${tsValue(value)},`;

function build() {
  const sql = readFileSync(SEED_FILE, 'utf8');
  const { rows: products } = extractCte(sql, 'seed');
  const { rows: mappings } = extractCte(sql, 'mapping');

  const concernsByProduct = new Map();
  for (const mapping of mappings) {
    const list = concernsByProduct.get(mapping.product_slug) ?? [];
    list.push(mapping.concern_slug);
    concernsByProduct.set(mapping.product_slug, list);
  }

  const categoryBySlug = new Map(CATEGORIES.map(([name, slug]) => [slug, name]));
  const concernBySlug = new Map(CONCERNS.map(([name, slug]) => [slug, name]));

  const out = [];
  out.push('// src/lib/demoData.ts');
  out.push('//');
  out.push('// GENERATED FILE — do not edit by hand.');
  out.push('// Produced from supabase/migrations/20251116150400_seed_products.sql so the');
  out.push('// offline demo catalogue and the seeded database can never drift apart.');
  out.push('// Regenerate with: npm run gen:demo');
  out.push('//');
  out.push('// When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent the app serves');
  out.push('// this data instead of failing every query, so the storefront stays explorable.');
  out.push("import type { Category, Product, SkinConcern } from './supabase';");
  out.push('');

  out.push('export const DEMO_CATEGORIES: Category[] = [');
  CATEGORIES.forEach(([name, slug, description, order], index) => {
    out.push('  {');
    out.push(field('id', `demo-cat-${slug}`, '    '));
    out.push(field('name', name, '    '));
    out.push(field('slug', slug, '    '));
    out.push(field('description', description, '    '));
    out.push(field('display_order', order, '    '));
    out.push(`    created_at: new Date(Date.UTC(2025, 10, ${index + 1})).toISOString(),`);
    out.push('  },');
  });
  out.push('];');
  out.push('');

  out.push('export const DEMO_CONCERNS: SkinConcern[] = [');
  CONCERNS.forEach(([name, slug, description, order]) => {
    out.push('  {');
    out.push(field('id', `demo-con-${slug}`, '    '));
    out.push(field('name', name, '    '));
    out.push(field('slug', slug, '    '));
    out.push(field('description', description, '    '));
    out.push(field('display_order', order, '    '));
    out.push('  },');
  });
  out.push('];');
  out.push('');

  out.push('export const DEMO_PRODUCTS: Product[] = [');
  products.forEach((product, index) => {
    const slug = product.slug;
    const categorySlug = product.category_slug;
    out.push('  {');
    out.push(field('id', `demo-product-${slug}`, '    '));
    out.push(field('name', product.name, '    '));
    out.push(field('slug', slug, '    '));
    out.push(field('short_description', product.short_description, '    '));
    out.push(field('description', product.description, '    '));
    out.push(field('ingredients', product.ingredients, '    '));
    out.push(field('how_to_use', product.how_to_use, '    '));
    out.push(field('price', product.price, '    '));
    out.push(field('compare_at_price', product.compare_at_price, '    '));
    out.push(field('category_id', `demo-cat-${categorySlug}`, '    '));
    out.push("    image_url: '',");
    out.push(field('is_new', product.is_new, '    '));
    out.push(field('stock_quantity', product.stock_quantity, '    '));
    out.push(field('rating', product.rating, '    '));
    out.push(field('review_count', product.review_count, '    '));
    // Newest first, matching the seed's random 0–30 day spread.
    out.push(`    created_at: new Date(Date.now() - ${30 - index} * 86_400_000).toISOString(),`);
    out.push('    category: {');
    out.push(field('id', `demo-cat-${categorySlug}`, '      '));
    out.push(field('name', categoryBySlug.get(categorySlug), '      '));
    out.push(field('slug', categorySlug, '      '));
    out.push('    },');
    out.push('    concerns: [');
    for (const concernSlug of concernsByProduct.get(slug) ?? []) {
      out.push('      {');
      out.push(field('id', `demo-con-${concernSlug}`, '        '));
      out.push(field('name', concernBySlug.get(concernSlug), '        '));
      out.push(field('slug', concernSlug, '        '));
      out.push('      },');
    }
    out.push('    ],');
    out.push('  },');
  });
  out.push('];');
  out.push('');

  return out.join('\n');
}

writeFileSync(OUT_FILE, build());
process.stdout.write(`Wrote ${OUT_FILE.replace(`${root}/`, '')}\n`);
