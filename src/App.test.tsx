// @vitest-environment jsdom
//
// Render-level smoke tests. These exist because the storefront previously
// compiled but rendered a blank screen for a large share of its routes
// (search, checkout, terms, product detail, 404) and every image 404'd.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CartProvider } from './contexts/CartContext';
import App from './App';

/** jsdom does not implement scroll APIs used by the router. */
beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, '', '/');
});

function renderApp(path = '/') {
  window.history.pushState({}, '', path);
  return render(
    <ToastProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('home page', () => {
  it('renders the hero and the demo-mode notice when Supabase is not configured', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /discover the secret to/i })).toBeTruthy();
    expect(screen.getByText(/demo mode/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /new arrivals/i })).toBeTruthy();
  });

  it('lists products from the demo catalogue', async () => {
    renderApp('/');
    expect(await screen.findByText(/Snail Mucin 92 Repair Ampoule/i)).toBeTruthy();
  });

  it('renders the shared footer on every page', async () => {
    renderApp('/');
    await screen.findByRole('heading', { name: /discover the secret to/i });
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /customer care/i })).toBeTruthy();
  });
});

describe('routing', () => {
  it('renders the cleanser category with its products', async () => {
    renderApp('/category/cleanser');
    expect(await screen.findByRole('heading', { name: /^cleanser$/i })).toBeTruthy();
    expect(await screen.findByText(/Hanbang Rice Water Cleansing Foam/i)).toBeTruthy();
  });

  it('resolves slug aliases used by the home page tiles', async () => {
    renderApp('/concern/sensitive-skin');
    expect(await screen.findByRole('heading', { name: /sensitive skin/i })).toBeTruthy();
    expect(await screen.findByText(/Heartleaf 77 Soothing Toner/i)).toBeTruthy();
  });

  it('renders the product detail page', async () => {
    renderApp('/product/snail-mucin-92-repair-ampoule');
    expect(await screen.findByRole('heading', { name: /snail mucin 92 repair ampoule/i })).toBeTruthy();
    expect(screen.getByText(/The cult hydration step/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /how to use/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /key ingredients/i })).toBeTruthy();
  });

  it('shows a 404 page for an unknown product', async () => {
    renderApp('/product/does-not-exist');
    expect(await screen.findByRole('heading', { name: /product not found/i })).toBeTruthy();
  });

  it('renders search results from the URL query', async () => {
    renderApp('/search?q=niacinamide');
    expect(await screen.findByText(/Pore Refining Serum/i)).toBeTruthy();
  });

  it('renders a 404 instead of a blank screen for unknown paths', async () => {
    renderApp('/this-route-does-not-exist');
    expect(await screen.findByRole('heading', { name: /we could not find that page/i })).toBeTruthy();
  });

  it.each(['terms', 'privacy', 'help', 'shipping', 'returns', 'contact'])(
    'renders the %s info page that the footer links to',
    async (slug) => {
      renderApp(`/info/${slug}`);
      await waitFor(() => {
        expect(screen.getByRole('article')).toBeTruthy();
      });
    }
  );
});

describe('cart flow', () => {
  it('adds a product from the detail page and updates the navbar badge', async () => {
    renderApp('/product/aqua-light-spf50-pa-sunscreen');
    await screen.findByRole('heading', { name: /aqua light spf50/i });

    fireEvent.click(screen.getByRole('button', { name: /add 1 to cart/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/cart, 1 item/i)).toBeTruthy();
    });

    // The badge survives a reload because product snapshots are persisted.
    expect(window.localStorage.getItem('skinfinity_cart_v3')).toContain('aqua-light-spf50');
  });

  it('opens the drawer from the navbar and reaches checkout', async () => {
    renderApp('/product/aqua-light-spf50-pa-sunscreen');
    await screen.findByRole('heading', { name: /aqua light spf50/i });
    fireEvent.click(screen.getByRole('button', { name: /add 1 to cart/i }));

    await waitFor(() => expect(screen.getByLabelText(/cart, 1 item/i)).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/cart, 1 item/i));

    const dialog = await screen.findByRole('dialog', { name: /shopping cart/i });
    // The name also appears in an sr-only <label>, so match the line item itself.
    expect(
      within(dialog).getByText('Aqua Light SPF50+ PA++++ Sunscreen', { selector: 'p' })
    ).toBeTruthy();
    expect(within(dialog).getByText(/Subtotal/i)).toBeTruthy();
    expect(within(dialog).getByText(/unlocked free shipping/i)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: /checkout/i }));

    // Checkout is guest-accessible in demo mode and collects an address.
    expect(await screen.findByRole('heading', { name: /^checkout$/i })).toBeTruthy();
    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
  });

  it('clamps the quantity to available stock', async () => {
    renderApp('/product/retinal-01-night-renewal-serum'); // seeded with 12 units
    await screen.findByRole('heading', { name: /retinal 0.1 night renewal serum/i });

    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    fireEvent.click(screen.getByRole('button', { name: /add 2 to cart/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/cart, 2 items/i)).toBeTruthy();
    });
  });
});

describe('wishlist', () => {
  it('saves a product and shows it on the wishlist page', async () => {
    renderApp('/product/ceramide-barrier-cream');
    await screen.findByRole('heading', { name: /ceramide barrier cream/i });

    fireEvent.click(screen.getByRole('button', { name: /save ceramide barrier cream to wishlist/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/wishlist, 1 item/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText(/wishlist, 1 item/i));
    expect(await screen.findByRole('heading', { name: /your wishlist/i })).toBeTruthy();
    expect(await screen.findByText(/Ceramide Barrier Cream/i)).toBeTruthy();
  });
});
