import { describe, expect, it } from 'vitest';
import { computeTotals, shippingFeeFor, validateAddress, FLAT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from './checkout';
import type { Product } from './supabase';

const product = (id: string, price: number, stock = 10): Product => ({ id, name: id, price, stock_quantity: stock });

describe('shippingFeeFor', () => {
  it('charges the flat fee below the threshold and nothing at or above it', () => {
    expect(shippingFeeFor(FREE_SHIPPING_THRESHOLD - 1)).toBe(FLAT_SHIPPING_FEE);
    expect(shippingFeeFor(FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(shippingFeeFor(FREE_SHIPPING_THRESHOLD + 500)).toBe(0);
  });
});

describe('computeTotals', () => {
  it('accepts string prices, which is what Supabase decimal columns return', () => {
    const totals = computeTotals([{ product: product('a', 1000), qty: 2 }]);
    expect(totals.subtotal).toBe(2000);
    expect(totals.itemCount).toBe(2);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(2000);
  });

  it('adds shipping below the free-shipping threshold', () => {
    const totals = computeTotals([{ product: product('a', 500), qty: 1 }]);
    expect(totals.subtotal).toBe(500);
    expect(totals.shipping).toBe(FLAT_SHIPPING_FEE);
    expect(totals.total).toBe(599);
  });

  it('applies discounts and never lets the total go negative', () => {
    const totals = computeTotals([{ product: product('a', 1000), qty: 1 }], 5000);
    expect(totals.discount).toBe(1000);
    expect(totals.total).toBe(0);
  });

  it('recomputes shipping against the discounted subtotal', () => {
    // 1600 - 200 = 1400, which drops back below the free-shipping threshold.
    const totals = computeTotals([{ product: product('a', 1600), qty: 1 }], 200);
    expect(totals.shipping).toBe(FLAT_SHIPPING_FEE);
    expect(totals.total).toBe(1400 + FLAT_SHIPPING_FEE);
  });

  it('charges no shipping for an empty cart', () => {
    expect(computeTotals([])).toEqual({
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      itemCount: 0,
    });
  });
});

describe('validateAddress', () => {
  const valid = {
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '9876543210',
    address_line1: '12 Road No 5',
    address_line2: '',
    city: 'Hyderabad',
    state: 'Telangana',
    postal_code: '500034',
    country: 'India',
  };

  it('accepts a complete Indian address', () => {
    expect(validateAddress(valid)).toEqual({});
  });

  it('accepts +91 and 0 prefixed mobile numbers', () => {
    expect(validateAddress({ ...valid, phone: '+91 98765 43210' })).toEqual({});
    expect(validateAddress({ ...valid, phone: '09876543210' })).toEqual({});
  });

  it('rejects numbers that cannot be Indian mobiles', () => {
    expect(validateAddress({ ...valid, phone: '1234567890' }).phone).toBeTruthy();
    expect(validateAddress({ ...valid, phone: '98765' }).phone).toBeTruthy();
  });

  it('reports every missing required field at once', () => {
    const errors = validateAddress({ ...valid, full_name: '', email: 'nope', postal_code: '123' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'full_name', 'postal_code']);
  });

  it('requires a 6-digit PIN code', () => {
    expect(validateAddress({ ...valid, postal_code: '50003' }).postal_code).toBeTruthy();
    expect(validateAddress({ ...valid, postal_code: '5000AB' }).postal_code).toBeTruthy();
  });
});
