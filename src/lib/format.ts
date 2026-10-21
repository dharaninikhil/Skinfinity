// src/lib/format.ts
// Shared formatting helpers. Supabase returns `decimal` columns as strings,
// so every price in the app must go through `toNumber` before formatting.

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Coerce a Supabase numeric/decimal value (string | number | null) to a number. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Format a price in Indian Rupees; falls back to an em dash for missing data. */
export function formatINR(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return inrFormatter.format(n);
}

/** Format a plain (non-currency) integer with Indian digit grouping. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Turn arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Candidate slug spellings for a lookup key, most specific first.
 * Tolerates the drift between seed slugs and asset filenames
 * (`sensitive-skin` vs `sensitive`, `lip-care` vs `lipcare`).
 */
export function slugVariants(slug: string): string[] {
  const base = slug.toString().trim().toLowerCase().replace(/\s+/g, '-');
  const bare = base.replace(/-/g, '');
  const words = base.split('-').filter(Boolean);
  const variants = new Set<string>([base, bare]);
  if (words.length > 1) {
    variants.add(words[0]);
    variants.add(words.slice(0, -1).join('-'));
  }
  return Array.from(variants).filter(Boolean);
}

/** Collapse a slug to letters/digits only, for fuzzy matching (`lip-care` -> `lipcare`). */
export function dedupeKey(input?: string | null): string {
  return (input ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** "3 items" / "1 item" */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}
