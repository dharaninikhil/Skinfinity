// src/lib/checkout.ts
// Order pricing rules. Kept out of the UI so the client and the `place_order`
// Postgres function can implement exactly the same numbers.

import { toNumber } from './format';
import type { Product } from './supabase';

/** Orders at or above this subtotal ship free (INR). */
export const FREE_SHIPPING_THRESHOLD = 1499;
/** Flat shipping fee below the free-shipping threshold (INR). */
export const FLAT_SHIPPING_FEE = 99;
export const CURRENCY = 'INR';

export type CartLine = { product: Product; qty: number };

export function shippingFeeFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

export type OrderTotals = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  itemCount: number;
};

/** Compute the totals for a set of cart lines. */
export function computeTotals(lines: CartLine[], discount = 0): OrderTotals {
  const subtotal = lines.reduce((sum, line) => sum + toNumber(line.product.price) * line.qty, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  const shipping = subtotal - safeDiscount > 0 ? shippingFeeFor(subtotal - safeDiscount) : 0;
  return {
    subtotal,
    shipping,
    discount: safeDiscount,
    total: Math.max(0, subtotal - safeDiscount + shipping),
    itemCount,
  };
}

/** Validate an Indian shipping address; returns a field -> error map. */
export function validateAddress(address: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!address.full_name?.trim()) errors.full_name = 'Please enter the recipient name.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email?.trim() ?? '')) errors.email = 'Enter a valid email address.';
  // Indian mobile numbers: 10 digits, optionally prefixed with +91 or 0.
  const phone = (address.phone ?? '').replace(/[\s-]/g, '');
  if (!/^(\+91|91|0)?[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
  if (!address.address_line1?.trim()) errors.address_line1 = 'Street address is required.';
  if (!address.city?.trim()) errors.city = 'City is required.';
  if (!address.state?.trim()) errors.state = 'State is required.';
  if (!/^\d{6}$/.test((address.postal_code ?? '').trim())) errors.postal_code = 'Enter a valid 6-digit PIN code.';

  return errors;
}

/** Default country for the storefront. */
export const DEFAULT_COUNTRY = 'India';
