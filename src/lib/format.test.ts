import { describe, expect, it } from 'vitest';
import { dedupeKey, formatCount, formatDate, formatINR, pluralize, slugVariants, slugify, toNumber } from './format';

describe('toNumber', () => {
  it('coerces the string decimals Supabase returns', () => {
    expect(toNumber('1150.00')).toBe(1150);
    expect(toNumber(42)).toBe(42);
  });

  it('treats missing and invalid values as zero', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('')).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(Number.NaN)).toBe(0);
  });
});

describe('formatINR', () => {
  it('formats prices with Indian digit grouping', () => {
    expect(formatINR(1499)).toBe('₹1,499');
    expect(formatINR('123456')).toBe('₹1,23,456');
    expect(formatINR(0)).toBe('₹0');
  });

  it('falls back to an em dash rather than rendering NaN', () => {
    expect(formatINR(null)).toBe('—');
    expect(formatINR(undefined)).toBe('—');
    expect(formatINR('')).toBe('—');
    expect(formatINR('not-a-price')).toBe('—');
  });
});

describe('slugVariants', () => {
  it('tolerates the drift between seed slugs and asset filenames', () => {
    expect(slugVariants('sensitive-skin')).toEqual(['sensitive-skin', 'sensitiveskin', 'sensitive']);
    expect(slugVariants('lip-care')).toEqual(['lip-care', 'lipcare', 'lip']);
    expect(slugVariants('dry-dehydrated')).toContain('dry');
  });

  it('normalises whitespace and case', () => {
    expect(slugVariants('  Ampoule   Serum ')).toEqual(['ampoule-serum', 'ampouleserum', 'ampoule']);
  });

  it('never returns empty candidates', () => {
    expect(slugVariants('')).toEqual([]);
    expect(slugVariants('new')).toEqual(['new']);
  });
});

describe('slugify and dedupeKey', () => {
  it('builds URL-safe slugs', () => {
    expect(slugify('Ampoule & Serum!')).toBe('ampoule-serum');
    expect(slugify("  Jane's Pick  ")).toBe('janes-pick');
  });

  it('collapses to alphanumerics for fuzzy matching', () => {
    expect(dedupeKey('lip-care')).toBe('lipcare');
    expect(dedupeKey('Lip Care')).toBe('lipcare');
    expect(dedupeKey(null)).toBe('');
  });
});

describe('pluralize and formatCount', () => {
  it('pluralises correctly', () => {
    expect(pluralize(1, 'item')).toBe('1 item');
    expect(pluralize(3, 'item')).toBe('3 items');
    expect(pluralize(2, 'line', 'lines')).toBe('2 lines');
  });

  it('groups large counts', () => {
    expect(formatCount(100000)).toBe('1,00,000');
  });
});

describe('formatDate', () => {
  it('renders a readable date and degrades safely', () => {
    expect(formatDate('2025-11-16T10:00:00Z')).toMatch(/2025/);
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});
