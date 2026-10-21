// src/lib/demoApi.ts
//
// Offline implementation of the catalogue and order queries, backed by the
// generated demo data in ./demoData. Used only when Supabase is not configured,
// so a fresh clone (or a reviewer without credentials) can still browse, search,
// add to cart and place an order end to end.
//
// Read paths mirror the Supabase helpers exactly; write paths are limited to
// demo orders persisted in localStorage.
import { CURRENCY } from './checkout';
import { DEMO_CATEGORIES, DEMO_CONCERNS, DEMO_PRODUCTS } from './demoData';
import { slugVariants, toNumber } from './format';
import {
  AppError,
  type CartItemRow,
  type Category,
  type CheckoutLine,
  type Order,
  type OrderItemRow,
  type Product,
  type ProductSort,
  type ShippingAddress,
  type SkinConcern,
} from './supabase';

/** Stand-in user id for guest demo orders. */
export const DEMO_USER_ID = 'demo-guest';

const ORDERS_KEY = 'skinfinity_demo_orders';

/* ------------------------------------------------------------------ helpers */

/** Deep-copy so callers can never mutate the generated catalogue. */
function clone<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const copy = [...products];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => toNumber(a.price) - toNumber(b.price));
    case 'price_desc':
      return copy.sort((a, b) => toNumber(b.price) - toNumber(a.price));
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
    default:
      return copy.sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
  }
}

function matchesAnyVariant(slug: string | null | undefined, candidate: string): boolean {
  if (!slug) return false;
  return slugVariants(candidate).includes(slug.toLowerCase());
}

/* --------------------------------------------------------------- catalogue */

export function demoCategories(): Category[] {
  return clone(DEMO_CATEGORIES);
}

export function demoConcerns(): SkinConcern[] {
  return clone(DEMO_CONCERNS);
}

export function demoResolveCategory(slugOrName: string): Category | null {
  const wanted = slugOrName.trim().toLowerCase();
  const found =
    DEMO_CATEGORIES.find((c) => matchesAnyVariant(c.slug ?? null, wanted)) ??
    DEMO_CATEGORIES.find((c) => c.name.toLowerCase().includes(wanted.replace(/-/g, ' ')));
  return found ? clone(found) : null;
}

export function demoResolveConcern(slugOrName: string): SkinConcern | null {
  const wanted = slugOrName.trim().toLowerCase();
  const found =
    DEMO_CONCERNS.find((c) => matchesAnyVariant(c.slug ?? null, wanted)) ??
    DEMO_CONCERNS.find((c) => c.name.toLowerCase().includes(wanted.replace(/-/g, ' ')));
  return found ? clone(found) : null;
}

export function demoNewArrivals(limit = 24): Product[] {
  return clone(DEMO_PRODUCTS.filter((p) => p.is_new)).slice(0, limit);
}

export function demoFeatured(limit = 8): Product[] {
  const inStock = DEMO_PRODUCTS.filter((p) => toNumber(p.stock_quantity) > 0);
  const ranked = [...inStock].sort(
    (a, b) => toNumber(b.rating) - toNumber(a.rating) || toNumber(b.review_count) - toNumber(a.review_count)
  );
  return clone(ranked.slice(0, limit));
}

export function demoProductsByCategorySlug(slug: string, sort: ProductSort = 'newest', limit = 100) {
  const category = demoResolveCategory(slug);
  if (!category) return { category: null as Category | null, products: [] as Product[] };
  const products = sortProducts(
    clone(DEMO_PRODUCTS.filter((p) => p.category_id === category.id)),
    sort
  ).slice(0, limit);
  return { category, products };
}

export function demoProductsByConcernSlug(slug: string, sort: ProductSort = 'newest', limit = 100) {
  const concern = demoResolveConcern(slug);
  if (!concern) return { concern: null as SkinConcern | null, products: [] as Product[] };
  const products = sortProducts(
    clone(DEMO_PRODUCTS.filter((p) => (p.concerns ?? []).some((c) => c.id === concern.id))),
    sort
  ).slice(0, limit);
  return { concern, products };
}

export function demoProductBySlug(slug: string): Product | null {
  const found = DEMO_PRODUCTS.find((p) => p.slug === slug);
  return found ? clone(found) : null;
}

export function demoProductById(id: string): Product | null {
  const found = DEMO_PRODUCTS.find((p) => p.id === id || p.slug === id);
  return found ? clone(found) : null;
}

export function demoProductsByIds(ids: string[]): Product[] {
  return clone(DEMO_PRODUCTS.filter((p) => ids.includes(p.id) || ids.includes(p.slug ?? '')));
}

export function demoRelated(product: Product, limit = 4): Product[] {
  if (!product.category_id) return [];
  return clone(
    DEMO_PRODUCTS.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, limit)
  );
}

export function demoSearch(term: string, limit = 48): { products: Product[]; total: number } {
  const q = term.trim().toLowerCase();
  if (!q) return { products: [], total: 0 };

  const haystack = (product: Product) =>
    [product.name, product.short_description, product.description, product.ingredients, product.category?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  const hits = DEMO_PRODUCTS.filter((product) => haystack(product).includes(q));
  return { products: clone(hits.slice(0, limit)), total: hits.length };
}

/** Demo carts are local-only; the server cart helpers are no-ops here. */
export function demoCartItems(): CartItemRow[] {
  return [];
}

/* ------------------------------------------------------------------ orders */

function readDemoOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemoOrders(orders: Order[]) {
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // ignore quota failures
  }
}

/**
 * Mirror of the `place_order` Postgres function: validates stock, prices the
 * order with the same thresholds and returns the created order.
 */
export function demoPlaceOrder(input: {
  address: ShippingAddress;
  lines: CheckoutLine[];
  paymentMethod?: string;
  notes?: string | null;
}): Order {
  const { address, lines, paymentMethod = 'cod', notes = '' } = input;

  if (lines.length === 0) throw new AppError('Your cart is empty.', 'UNKNOWN');
  if (!address.full_name || !address.address_line1 || !address.city || !address.postal_code) {
    throw new AppError('A complete shipping address is required.', 'UNKNOWN');
  }

  const items: OrderItemRow[] = [];
  let subtotal = 0;

  for (const line of lines) {
    const product = DEMO_PRODUCTS.find((p) => p.id === line.product_id || p.slug === line.product_id);
    if (!product) throw new AppError('A product in your cart is no longer available.', 'NOT_FOUND');

    const available = toNumber(product.stock_quantity);
    if (available < line.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}: only ${available} left.`, 'OUT_OF_STOCK', {
        available,
      });
    }

    subtotal += toNumber(product.price) * line.quantity;
    items.push({
      id: `demo-item-${product.slug}-${Date.now()}`,
      order_id: '',
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug ?? '',
      image_url: product.image_url ?? '',
      unit_price: toNumber(product.price),
      quantity: line.quantity,
    });
  }

  const shipping = subtotal >= 1499 ? 0 : 99;
  const id = `demo-order-${Date.now().toString(36)}`;
  const orderNumber = `SKF-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${id.slice(-6).toUpperCase()}`;

  const order: Order = {
    id,
    user_id: DEMO_USER_ID,
    order_number: orderNumber,
    status: paymentMethod === 'cod' ? 'pending' : 'paid',
    subtotal,
    shipping_fee: shipping,
    discount: 0,
    total: subtotal + shipping,
    currency: CURRENCY,
    ...address,
    payment_method: paymentMethod,
    notes: notes ?? '',
    created_at: new Date().toISOString(),
    items: items.map((item) => ({ ...item, order_id: id })),
  };

  writeDemoOrders([order, ...readDemoOrders()]);
  return order;
}

export function demoFetchOrders(): Order[] {
  return readDemoOrders();
}

export function demoFetchOrderById(orderId: string): Order | null {
  return readDemoOrders().find((order) => order.id === orderId || order.order_number === orderId) ?? null;
}
