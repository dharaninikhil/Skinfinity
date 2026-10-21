import { describe, expect, it } from 'vitest';
import { buildPath, parseRoute, stripBase, tokenToPath, withBase } from './router';

describe('parseRoute', () => {
  it('maps the root to home', () => {
    expect(parseRoute('/').page).toBe('home');
    expect(parseRoute('').page).toBe('home');
  });

  it('parses single-segment pages', () => {
    for (const page of ['cart', 'checkout', 'wishlist', 'profile', 'orders', 'login', 'search', 'new']) {
      expect(parseRoute(`/${page}`).page).toBe(page);
    }
  });

  it('captures path parameters', () => {
    expect(parseRoute('/category/ampoule-serum')).toMatchObject({ page: 'category', param: 'ampoule-serum' });
    expect(parseRoute('/concern/sensitive')).toMatchObject({ page: 'concern', param: 'sensitive' });
    expect(parseRoute('/product/snail-mucin-92')).toMatchObject({ page: 'product', param: 'snail-mucin-92' });
    expect(parseRoute('/order/abc123')).toMatchObject({ page: 'order', param: 'abc123' });
  });

  it('decodes URI components', () => {
    expect(parseRoute('/product/the%20serum').param).toBe('the serum');
  });

  it('exposes query parameters', () => {
    const route = parseRoute('/search', '?q=vitamin+c');
    expect(route.page).toBe('search');
    expect(route.query.get('q')).toBe('vitamin c');
  });

  it('resolves info pages both with and without the /info prefix', () => {
    expect(parseRoute('/info/terms')).toMatchObject({ page: 'info', param: 'terms' });
    expect(parseRoute('/terms')).toMatchObject({ page: 'info', param: 'terms' });
    expect(parseRoute('/privacy')).toMatchObject({ page: 'info', param: 'privacy' });
  });

  it('falls back to notfound instead of rendering nothing', () => {
    expect(parseRoute('/nonsense').page).toBe('notfound');
    expect(parseRoute('/category').page).toBe('notfound');
    expect(parseRoute('/product').page).toBe('notfound');
  });

  it('promotes a bare /order to the orders list', () => {
    expect(parseRoute('/order').page).toBe('orders');
  });
});

describe('tokenToPath', () => {
  it('passes real paths straight through', () => {
    expect(tokenToPath('/cart')).toBe('/cart');
    expect(tokenToPath('/product/x')).toBe('/product/x');
  });

  it('translates legacy navigation tokens', () => {
    expect(tokenToPath('home')).toBe('/');
    expect(tokenToPath('cart')).toBe('/cart');
    expect(tokenToPath('category-cleanser')).toBe('/category/cleanser');
    expect(tokenToPath('concern-acne-breakout')).toBe('/concern/acne-breakout');
    expect(tokenToPath('product-snail-mucin')).toBe('/product/snail-mucin');
    expect(tokenToPath('order-42')).toBe('/order/42');
  });

  it('maps footer info tokens onto info routes', () => {
    expect(tokenToPath('terms')).toBe('/info/terms');
    expect(tokenToPath('shipping')).toBe('/info/shipping');
    expect(tokenToPath('contact')).toBe('/info/contact');
  });

  it('converts search tokens into a query string', () => {
    expect(tokenToPath('search')).toBe('/search');
    expect(tokenToPath('search-vitamin%20c')).toBe('/search?q=vitamin%20c');
  });

  it('encodes parameters that need it', () => {
    expect(tokenToPath('category-lip care')).toBe('/category/lip%20care');
  });

  it('never produces an empty path', () => {
    expect(tokenToPath('')).toBe('/');
    expect(tokenToPath('   ')).toBe('/');
  });
});

describe('buildPath', () => {
  it('is the inverse of parseRoute for parameterised pages', () => {
    expect(buildPath('home')).toBe('/');
    expect(buildPath('category', 'toner')).toBe('/category/toner');
    expect(buildPath('product', 'a-b')).toBe('/product/a-b');
    expect(buildPath('info', 'returns')).toBe('/info/returns');
  });
});

describe('base path handling', () => {
  it('is a no-op when the app is served from the root', () => {
    expect(stripBase('/cart')).toBe('/cart');
    expect(withBase('/cart')).toBe('/cart');
  });

  it('does not collapse legitimate double slashes inside a path segment', () => {
    expect(withBase('/product/a-b')).toBe('/product/a-b');
  });
});
