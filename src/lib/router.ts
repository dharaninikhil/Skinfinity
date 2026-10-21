// src/lib/router.ts
//
// Minimal History-API router. The app previously kept the current page in
// `useState`, which meant no deep links, no working back button and a blank
// screen for any navigation token that had no matching `if` branch. This module
// gives real URLs without pulling in a routing dependency.

export type Page =
  | 'home'
  | 'new'
  | 'category'
  | 'concern'
  | 'product'
  | 'search'
  | 'cart'
  | 'checkout'
  | 'wishlist'
  | 'profile'
  | 'orders'
  | 'order'
  | 'login'
  | 'info'
  | 'notfound';

export type Route = {
  page: Page;
  /** Primary path parameter (category slug, product slug, order id, ...). */
  param?: string;
  /** `?q=` for search and any other query values. */
  query: URLSearchParams;
  /** The normalised pathname this route was parsed from. */
  path: string;
};

/** Static info pages rendered by `InfoPage`. */
export const INFO_PAGES = ['terms', 'privacy', 'help', 'shipping', 'returns', 'contact'] as const;
export type InfoSlug = (typeof INFO_PAGES)[number];

const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

/** Strip the Vite base path so routing works when deployed under a sub-path. */
export function stripBase(pathname: string): string {
  if (BASE && pathname.startsWith(BASE)) {
    const rest = pathname.slice(BASE.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname;
}

/** Re-apply the base path before handing a URL to the History API. */
export function withBase(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean === '/' ? '/' : clean}`.replace(/\/{2,}/g, '/');
}

export function parseRoute(pathname: string, search = ''): Route {
  const path = stripBase(pathname || '/');
  const query = new URLSearchParams(search);
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);

  const route = (page: Page, param?: string): Route => ({ page, param, query, path });

  if (segments.length === 0) return route('home');

  const [head, second, ...rest] = segments;

  switch (head) {
    case 'new':
      return route('new');
    case 'cart':
      return route('cart');
    case 'checkout':
      return route('checkout');
    case 'wishlist':
      return route('wishlist');
    case 'profile':
      return route('profile');
    case 'orders':
      return route('orders');
    case 'login':
      return route('login');
    case 'search':
      return route('search');
    case 'category':
      return second ? route('category', [second, ...rest].join('/')) : route('notfound');
    case 'concern':
      return second ? route('concern', [second, ...rest].join('/')) : route('notfound');
    case 'product':
      return second ? route('product', [second, ...rest].join('/')) : route('notfound');
    case 'order':
      return second ? route('order', second) : route('orders');
    case 'info':
      return second ? route('info', second) : route('notfound');
    // Friendly aliases so that /terms and /shipping work too.
    default:
      if ((INFO_PAGES as readonly string[]).includes(head)) return route('info', head);
      return route('notfound');
  }
}

/** Build a pathname from a page + optional parameter. */
export function buildPath(page: Page, param?: string): string {
  switch (page) {
    case 'home':
      return '/';
    case 'info':
      return `/info/${encodeURIComponent(param ?? 'help')}`;
    case 'category':
    case 'concern':
    case 'product':
    case 'order':
      return `/${page}/${encodeURIComponent(param ?? '')}`;
    case 'search':
      return '/search';
    default:
      return `/${page}`;
  }
}

/* ------------------------------------------------------------------ *
 * Navigation tokens
 *
 * Pages call `navigate('category-cleanser')` style tokens. They are translated
 * here so call sites stay terse and existing tokens keep working.
 * ------------------------------------------------------------------ */

/** Known single-word tokens that map straight onto a page. */
const SIMPLE_TOKENS = new Set<string>([
  'home',
  'new',
  'cart',
  'checkout',
  'wishlist',
  'profile',
  'orders',
  'login',
  'search',
  'terms',
  'privacy',
  'help',
  'shipping',
  'returns',
  'contact',
]);

/**
 * Convert either a path (`/category/cleanser`) or a legacy token
 * (`category-cleanser`) into a normalised path.
 */
export function tokenToPath(token: string): string {
  const raw = token.trim();
  if (!raw) return '/';
  if (raw.startsWith('/')) return raw;

  if (SIMPLE_TOKENS.has(raw)) {
    if ((INFO_PAGES as readonly string[]).includes(raw)) return `/info/${raw}`;
    return raw === 'home' ? '/' : `/${raw}`;
  }

  // `search-<query>` and `search?q=<query>`
  if (raw.startsWith('search-')) {
    const term = raw.slice('search-'.length);
    return `/search?q=${encodeURIComponent(decodeURIComponent(term))}`;
  }

  const hyphen = raw.indexOf('-');
  if (hyphen > 0) {
    const head = raw.slice(0, hyphen);
    const param = raw.slice(hyphen + 1);
    if (head === 'category' || head === 'concern' || head === 'product') {
      return `/${head}/${encodeURIComponent(param)}`;
    }
    if (head === 'order') return `/order/${encodeURIComponent(param)}`;
  }

  // Unknown token: surface the 404 page rather than a blank screen.
  return `/${raw.split('-')[0]}`;
}

/* ------------------------------------------------------------------ *
 * Tiny observable store
 * ------------------------------------------------------------------ */

type Listener = (location: { path: string; search: string }) => void;

const listeners = new Set<Listener>();

function currentLocation() {
  if (typeof window === 'undefined') return { path: '/', search: '' };
  return { path: window.location.pathname, search: window.location.search };
}

export function subscribeRoute(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  const loc = currentLocation();
  listeners.forEach((l) => l(loc));
}

export type NavigateOptions = { replace?: boolean; keepScroll?: boolean };

/**
 * Navigate to a path or legacy token. Scrolls to the top unless `keepScroll`.
 */
export function navigate(to: string, options: NavigateOptions = {}): void {
  if (typeof window === 'undefined') return;

  const target = withBase(tokenToPath(to));
  const current = withBase(`${window.location.pathname}${window.location.search}`);
  if (target === current) {
    emit();
    return;
  }

  if (options.replace) {
    window.history.replaceState({}, '', target);
  } else {
    window.history.pushState({}, '', target);
  }

  if (!options.keepScroll) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
  emit();
}

/** Start listening to browser back/forward. Called once by the router hook. */
export function startHistoryListener(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onPop = () => emit();
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}

export { currentLocation };
