// src/lib/supabase.ts
//
// Single source of truth for the Supabase client, database row types and every
// server-side data operation used by the storefront. UI code should never build
// queries inline — go through the helpers exported here so that caching,
// error shape and column naming stay consistent.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  demoCartItems,
  demoCategories,
  demoConcerns,
  demoFeatured,
  demoFetchOrderById,
  demoFetchOrders,
  demoNewArrivals,
  demoPlaceOrder,
  demoProductById,
  demoProductBySlug,
  demoProductsByCategorySlug,
  demoProductsByConcernSlug,
  demoProductsByIds,
  demoRelated,
  demoResolveCategory,
  demoResolveConcern,
  demoSearch,
} from './demoApi';
import { slugVariants } from './format';

/* ------------------------------------------------------------------ *
 * Client bootstrap
 * ------------------------------------------------------------------ */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when both env vars are present. When false the app still renders
 * (with empty catalogue states) instead of crashing, but every query will fail.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[Skinfinity] Missing Supabase config. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * A client pointed at an unroutable host. Queries reject fast with a clear
 * message rather than throwing at import time, so the shell still renders.
 */
export const supabase: SupabaseClient = createClient(
  url ?? 'https://missing-supabase-config.invalid',
  anonKey ?? 'missing-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } }
);

/* ------------------------------------------------------------------ *
 * Row types
 * ------------------------------------------------------------------ */

export type Product = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  short_description?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  category_id?: string | null;
  image_url?: string | null;
  ingredients?: string | null;
  how_to_use?: string | null;
  is_new?: boolean;
  stock_quantity?: number | null;
  rating?: number | null;
  review_count?: number | null;
  created_at?: string;
  updated_at?: string;
  /** Populated by the `category:categories(*)` join. */
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  /** Populated by the `product_concerns(skin_concerns(*))` join. */
  concerns?: Array<Pick<SkinConcern, 'id' | 'name' | 'slug'>>;
};

export type Category = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  display_order?: number | null;
  created_at?: string;
};

export type SkinConcern = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  display_order?: number | null;
  created_at?: string;
};

export type ProductConcern = {
  id: string;
  product_id: string;
  concern_id: string;
  created_at?: string;
};

export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive' | 'other' | '';

export type Profile = {
  id: string;
  full_name?: string | null;
  skin_type?: SkinType | string | null;
  avatar_url?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** `cart_items` joined with its product. */
export type CartItemRow = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
  product?: Product | null;
};

/** `wishlists` row. `product_json` is a denormalised snapshot of the product. */
export type WishlistRow = {
  id: string;
  user_id: string;
  product_id: string;
  product_json?: Product | string | null;
  created_at?: string;
};

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_slug?: string | null;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  currency: string;
  full_name: string;
  email: string;
  phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  payment_method: string;
  notes?: string | null;
  created_at?: string;
  items?: OrderItemRow[];
};

/** Shipping address collected at checkout. */
export type ShippingAddress = Pick<
  Order,
  | 'full_name'
  | 'email'
  | 'phone'
  | 'address_line1'
  | 'address_line2'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'country'
>;

/** One line of a checkout payload. */
export type CheckoutLine = { product_id: string; quantity: number };

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export type AppErrorCode =
  | 'OUT_OF_STOCK'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

/** Normalised application error so callers can branch on `code`. */
export class AppError extends Error {
  code: AppErrorCode;
  /** Stock actually available, set when `code === 'OUT_OF_STOCK'`. */
  available?: number;
  /** Original Supabase/JS error, for logging. */
  cause?: unknown;

  constructor(message: string, code: AppErrorCode = 'UNKNOWN', extra?: { available?: number; cause?: unknown }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.available = extra?.available;
    this.cause = extra?.cause;
  }
}

function wrap(error: unknown, context: string): AppError {
  if (error instanceof AppError) return error;
  const e = error as { message?: string; code?: string; status?: number } | null;
  const message = e?.message ?? 'Something went wrong';

  if (!isSupabaseConfigured) {
    return new AppError(`${context}: Supabase is not configured.`, 'NOT_CONFIGURED', { cause: error });
  }
  if (e?.status === 401 || e?.status === 403 || e?.code === '42501') {
    return new AppError(`${context}: you do not have permission to do that.`, 'UNAUTHENTICATED', { cause: error });
  }
  if (e?.code === 'PGRST116') {
    return new AppError(`${context}: not found.`, 'NOT_FOUND', { cause: error });
  }
  return new AppError(message, 'UNKNOWN', { cause: error });
}

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

/**
 * Columns selected for every product query. The joins keep the UI from
 * issuing one extra request per card (category label, concern chips).
 */
export const PRODUCT_SELECT = `
  id, name, slug, description, short_description, price, compare_at_price,
  category_id, image_url, ingredients, how_to_use, is_new, stock_quantity,
  rating, review_count, created_at, updated_at,
  category:categories(id, name, slug),
  concerns:product_concerns(skin_concerns(id, name, slug))
`;

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

const SORTS: Record<ProductSort, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  name_asc: { column: 'name', ascending: true },
};

/**
 * The `concerns` join comes back as `[{ skin_concerns: {...} }]`, which is
 * awkward to render. Flatten it to a plain concern array once, here.
 */
type RawProductRow = Omit<Product, 'concerns'> & {
  concerns?: Array<
    { skin_concerns?: Pick<SkinConcern, 'id' | 'name' | 'slug'> | null } | Pick<SkinConcern, 'id' | 'name' | 'slug'> | null
  > | null;
};

type FlatConcern = NonNullable<Product['concerns']>;

/**
 * Coerce a raw joined row into a `Product`. The Supabase client infers an
 * awkward shape from the select string, so the join is re-typed here once
 * instead of casting at every call site.
 */
function normalizeProduct(row: unknown): Product {
  const { concerns: rawConcerns, ...rest } = (row ?? {}) as RawProductRow;
  const concerns: FlatConcern = (Array.isArray(rawConcerns) ? rawConcerns : [])
    .map((entry) => {
      if (!entry) return null;
      const nested = 'skin_concerns' in entry ? entry.skin_concerns : null;
      const candidate = nested ?? ('id' in entry ? entry : null);
      return candidate && candidate.id ? candidate : null;
    })
    .filter((c): c is FlatConcern[number] => c !== null);
  return { ...(rest as Omit<Product, 'concerns'>), concerns };
}

function normalizeProducts(rows: unknown): Product[] {
  return (Array.isArray(rows) ? rows : []).map(normalizeProduct);
}

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return demoCategories();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .limit(50);
  if (error) throw wrap(error, 'Could not load categories');
  return (data ?? []) as Category[];
}

export async function fetchConcerns(): Promise<SkinConcern[]> {
  if (!isSupabaseConfigured) return demoConcerns();
  const { data, error } = await supabase
    .from('skin_concerns')
    .select('*')
    .order('display_order', { ascending: true })
    .limit(50);
  if (error) throw wrap(error, 'Could not load skin concerns');
  return (data ?? []) as SkinConcern[];
}

export async function fetchNewArrivals(limit = 24): Promise<Product[]> {
  if (!isSupabaseConfigured) return demoNewArrivals(limit);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw wrap(error, 'Could not load new arrivals');
  return normalizeProducts(data);
}

export async function fetchFeaturedProducts(limit = 8): Promise<Product[]> {
  if (!isSupabaseConfigured) return demoFeatured(limit);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .gt('stock_quantity', 0)
    .order('rating', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw wrap(error, 'Could not load featured products');
  return normalizeProducts(data);
}

export type ProductQuery = {
  categorySlug?: string;
  concernSlug?: string;
  isNew?: boolean;
  sort?: ProductSort;
  limit?: number;
};

export async function fetchProductsByCategorySlug(slug: string, sort: ProductSort = 'newest', limit = 100) {
  if (!isSupabaseConfigured) return demoProductsByCategorySlug(slug, sort, limit);
  const category = await resolveCategory(slug);
  if (!category) return { category: null as Category | null, products: [] as Product[] };

  const { column, ascending } = SORTS[sort];
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('category_id', category.id)
    .order(column, { ascending })
    .limit(limit);
  if (error) throw wrap(error, 'Could not load products');
  return { category, products: normalizeProducts(data) };
}

export async function fetchProductsByConcernSlug(slug: string, sort: ProductSort = 'newest', limit = 100) {
  if (!isSupabaseConfigured) return demoProductsByConcernSlug(slug, sort, limit);
  const concern = await resolveConcern(slug);
  if (!concern) return { concern: null as SkinConcern | null, products: [] as Product[] };

  const { data: links, error: linkError } = await supabase
    .from('product_concerns')
    .select('product_id')
    .eq('concern_id', concern.id);
  if (linkError) throw wrap(linkError, 'Could not load products for this concern');

  const ids = (links ?? []).map((l) => l.product_id).filter(Boolean) as string[];
  if (ids.length === 0) return { concern, products: [] as Product[] };

  const { column, ascending } = SORTS[sort];
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('id', ids)
    .order(column, { ascending })
    .limit(limit);
  if (error) throw wrap(error, 'Could not load products');
  return { concern, products: normalizeProducts(data) };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return demoProductBySlug(slug);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw wrap(error, 'Could not load this product');
  return data ? normalizeProduct(data) : null;
}

export async function fetchProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return demoProductById(id);
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (error) throw wrap(error, 'Could not load this product');
  return data ? normalizeProduct(data) : null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  if (!isSupabaseConfigured) return demoProductsByIds(ids);
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).in('id', ids);
  if (error) throw wrap(error, 'Could not load products');
  return normalizeProducts(data);
}

export async function fetchRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!product.category_id) return [];
  if (!isSupabaseConfigured) return demoRelated(product, limit);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .limit(limit);
  if (error) throw wrap(error, 'Could not load related products');
  return normalizeProducts(data);
}

export type SearchResults = { products: Product[]; total: number };

export async function searchProducts(term: string, limit = 48): Promise<SearchResults> {
  const q = term.trim();
  if (!q) return { products: [], total: 0 };
  if (!isSupabaseConfigured) return demoSearch(q, limit);

  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  const { data, error, count } = await supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .or(`name.ilike.${pattern},short_description.ilike.${pattern},description.ilike.${pattern},ingredients.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw wrap(error, 'Search failed');
  return { products: normalizeProducts(data), total: count ?? (data?.length ?? 0) };
}

// Categories and concerns are looked up by every tolerated slug spelling
// (see `slugVariants` in ./format) and finally by a case-insensitive name match,
// so deep links keep working when seed slugs and asset filenames disagree.

export async function resolveCategory(slugOrName: string): Promise<Category | null> {
  if (!isSupabaseConfigured) return demoResolveCategory(slugOrName);
  const candidates = slugVariants(slugOrName);
  for (const slug of candidates) {
    const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
    if (error) throw wrap(error, 'Could not load this category');
    if (data) return data as Category;
  }
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .ilike('name', `%${slugOrName.replace(/-/g, ' ')}%`)
    .maybeSingle();
  if (error) throw wrap(error, 'Could not load this category');
  return (data as Category) ?? null;
}

export async function resolveConcern(slugOrName: string): Promise<SkinConcern | null> {
  if (!isSupabaseConfigured) return demoResolveConcern(slugOrName);
  const candidates = slugVariants(slugOrName);
  for (const slug of candidates) {
    const { data, error } = await supabase.from('skin_concerns').select('*').eq('slug', slug).maybeSingle();
    if (error) throw wrap(error, 'Could not load this skin concern');
    if (data) return data as SkinConcern;
  }
  const { data, error } = await supabase
    .from('skin_concerns')
    .select('*')
    .ilike('name', `%${slugOrName.replace(/-/g, ' ')}%`)
    .maybeSingle();
  if (error) throw wrap(error, 'Could not load this skin concern');
  return (data as SkinConcern) ?? null;
}

/* ------------------------------------------------------------------ *
 * Profiles
 * ------------------------------------------------------------------ */

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw wrap(error, 'Could not load your profile');
  return (data as Profile) ?? null;
}

export async function updateProfile(
  userId: string,
  patch: { full_name?: string; skin_type?: string | null; phone?: string | null; avatar_url?: string | null }
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw wrap(error, 'Could not save your profile');
  if (!data) {
    // Profile row missing (e.g. created before the trigger existed) — create it.
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, ...patch })
      .select('*')
      .single();
    if (insertError) throw wrap(insertError, 'Could not save your profile');
    return inserted as Profile;
  }
  return data as Profile;
}

/* ------------------------------------------------------------------ *
 * Cart (server-backed)
 * ------------------------------------------------------------------ */

/** Local cart shape persisted to localStorage: product id -> qty. */
export type LocalCartState = Record<string, number>;

/**
 * Carts are stored directly in `cart_items` keyed by `user_id`, so there is no
 * cart header row to create. This helper exists for API symmetry with the
 * documented pattern and to guarantee at least one round-trip has validated
 * the user's cart policies before the UI starts writing.
 */
export async function getOrCreateCartForUser(userId: string): Promise<CartItemRow[]> {
  if (!userId) throw new AppError('A signed-in user is required.', 'UNAUTHENTICATED');
  return fetchCartItems(userId);
}

export async function fetchCartItems(userId: string): Promise<CartItemRow[]> {
  if (!isSupabaseConfigured) return demoCartItems();
  if (!userId) throw new AppError('A signed-in user is required.', 'UNAUTHENTICATED');

  const { data, error } = await supabase
    .from('cart_items')
    .select('id, user_id, product_id, quantity, created_at, updated_at, product:products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw wrap(error, 'Could not load your cart');
  const rows = (data ?? []) as unknown as Array<CartItemRow & { product?: unknown }>;
  return rows.map(({ product, ...row }) => ({
    ...row,
    product: product ? normalizeProduct(product) : null,
  }));
}

/**
 * Insert or update a cart line, enforcing available stock.
 * Throws `AppError` with `code === 'OUT_OF_STOCK'` and `.available` when the
 * requested quantity exceeds `products.stock_quantity`.
 */
export async function upsertCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartItemRow> {
  if (!isSupabaseConfigured) return { id: '', user_id: userId, product_id: productId, quantity };
  if (!userId) throw new AppError('Sign in to sync your cart.', 'UNAUTHENTICATED');
  if (!productId) throw new AppError('Missing product id.', 'UNKNOWN');

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, stock_quantity')
    .eq('id', productId)
    .maybeSingle();
  if (productError) throw wrap(productError, 'Could not validate stock');
  if (!product) throw new AppError('That product is no longer available.', 'NOT_FOUND');

  const available = Number(product.stock_quantity ?? 0);
  if (quantity > 0 && available <= 0) {
    throw new AppError('This product is out of stock.', 'OUT_OF_STOCK', { available: 0 });
  }
  if (quantity > available) {
    throw new AppError(`Only ${available} left in stock.`, 'OUT_OF_STOCK', { available });
  }

  if (quantity <= 0) {
    const { error } = await supabase.from('cart_items').delete().match({ user_id: userId, product_id: productId });
    if (error) throw wrap(error, 'Could not remove this item');
    return { id: '', user_id: userId, product_id: productId, quantity: 0 };
  }

  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      { user_id: userId, product_id: productId, quantity, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,product_id' }
    )
    .select('id, user_id, product_id, quantity, created_at, updated_at')
    .single();

  if (error) throw wrap(error, 'Could not update your cart');
  return data as CartItemRow;
}

/**
 * Merge a guest (localStorage) cart into the server cart on sign-in.
 * Quantities are summed and clamped to available stock; lines that cannot be
 * satisfied are reported back so the UI can tell the user what was dropped.
 */
export async function mergeLocalCartIntoServer(
  userId: string,
  localCart: LocalCartState
): Promise<{ merged: CartItemRow[]; skipped: Array<{ productId: string; requested: number; available: number }> }> {
  const entries = Object.entries(localCart ?? {}).filter(([, qty]) => Number(qty) > 0);
  if (entries.length === 0 || !isSupabaseConfigured) return { merged: [], skipped: [] };

  const serverRows = await fetchCartItems(userId);
  const serverQty = new Map(serverRows.map((r) => [r.product_id, r.quantity]));

  const merged: CartItemRow[] = [];
  const skipped: Array<{ productId: string; requested: number; available: number }> = [];

  for (const [productId, localQty] of entries) {
    const wanted = (serverQty.get(productId) ?? 0) + Number(localQty);
    try {
      merged.push(await upsertCartItem(userId, productId, wanted));
    } catch (err) {
      if (err instanceof AppError && err.code === 'OUT_OF_STOCK') {
        const available = err.available ?? 0;
        if (available > 0) {
          merged.push(await upsertCartItem(userId, productId, available));
          skipped.push({ productId, requested: wanted, available });
        } else {
          skipped.push({ productId, requested: wanted, available: 0 });
        }
      } else {
        throw err;
      }
    }
  }

  return { merged, skipped };
}

/** Replace the server cart with an exact set of lines (used after checkout). */
export async function clearServerCart(userId: string): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (error) throw wrap(error, 'Could not clear your cart');
}

/* ------------------------------------------------------------------ *
 * Wishlist (server-backed)
 * ------------------------------------------------------------------ */

export async function fetchWishlist(userId: string): Promise<WishlistRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('wishlists')
    .select('id, user_id, product_id, product_json, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw wrap(error, 'Could not load your wishlist');
  return (data ?? []) as WishlistRow[];
}

export async function addWishlistItem(userId: string, product: Product): Promise<WishlistRow> {
  const { data, error } = await supabase
    .from('wishlists')
    .upsert(
      { user_id: userId, product_id: product.id, product_json: product },
      { onConflict: 'user_id,product_id' }
    )
    .select('id, user_id, product_id, product_json, created_at')
    .single();
  if (error) throw wrap(error, 'Could not save to your wishlist');
  return data as WishlistRow;
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('wishlists').delete().match({ user_id: userId, product_id: productId });
  if (error) throw wrap(error, 'Could not remove from your wishlist');
}

export async function clearWishlistForUser(userId: string): Promise<void> {
  const { error } = await supabase.from('wishlists').delete().eq('user_id', userId);
  if (error) throw wrap(error, 'Could not clear your wishlist');
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

export type PlaceOrderInput = {
  userId: string;
  address: ShippingAddress;
  lines: CheckoutLine[];
  paymentMethod?: string;
  notes?: string | null;
};

/**
 * Atomically validates stock, decrements it, writes the order + line items and
 * clears the server cart. Implemented as a Postgres function
 * (`place_order`) so pricing and stock can never be tampered with client-side.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const { userId, address, lines, paymentMethod = 'cod', notes = null } = input;
  if (!lines.length) throw new AppError('Your cart is empty.', 'UNKNOWN');

  // Demo mode has no auth and no database; mirror the RPC locally instead.
  if (!isSupabaseConfigured) return demoPlaceOrder({ address, lines, paymentMethod, notes });

  if (!userId) throw new AppError('Sign in to place an order.', 'UNAUTHENTICATED');

  const { data, error } = await supabase.rpc('place_order', {
    p_address: address,
    p_items: lines,
    p_payment_method: paymentMethod,
    p_notes: notes,
  });
  if (error) {
    const message = error.message ?? '';
    if (/stock/i.test(message)) {
      throw new AppError(message, 'OUT_OF_STOCK', { cause: error });
    }
    throw wrap(error, 'Could not place your order');
  }
  return data as Order;
}

export async function fetchOrders(userId: string): Promise<Order[]> {
  if (!isSupabaseConfigured) return demoFetchOrders();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw wrap(error, 'Could not load your orders');
  return (data ?? []) as Order[];
}

export async function fetchOrderById(userId: string, orderId: string): Promise<Order | null> {
  if (!isSupabaseConfigured) return demoFetchOrderById(orderId);
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw wrap(error, 'Could not load this order');
  return (data as Order) ?? null;
}

/* ------------------------------------------------------------------ *
 * Newsletter
 * ------------------------------------------------------------------ */

/**
 * Record a newsletter sign-up. Duplicate emails are ignored rather than
 * rejected so the form can stay fire-and-forget.
 */
export async function subscribeNewsletter(email: string): Promise<void> {
  const value = email.trim().toLowerCase();
  if (!value) throw new AppError('Enter your email address.', 'UNKNOWN');
  // No backend to record it against; treat the sign-up as accepted.
  if (!isSupabaseConfigured) return;

  // Insert-only table (no UPDATE policy), so duplicates are ignored rather than
  // upserted. A repeat sign-up is still a success from the shopper's point of view.
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: value }, { count: 'exact' });

  if (error && error.code !== '23505') {
    throw wrap(error, 'Could not subscribe you right now');
  }
}
