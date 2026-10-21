// src/App.tsx
//
// Route switch for the storefront. Navigation used to live in `useState`, so
// deep links, the back button and any token without a matching branch (search,
// checkout, terms, …) rendered a blank page. Everything now maps to a real URL.
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useRoute } from './hooks/useRoute';
import { isSupabaseConfigured } from './lib/supabase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import { Toaster } from './contexts/ToastContext';
import { PageLoader } from './components/ui';
import HomePage from './pages/HomePage';
import NewArrivalsPage from './pages/NewArrivalsPage';
import CategoryPage from './pages/CategoryPage';
import ConcernPage from './pages/ConcernPage';
import ProductPage from './pages/ProductPage';
import SearchPage from './pages/SearchPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage';
import WishlistPage from './pages/WishlistPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import InfoPage from './pages/InfoPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Routes that require a signed-in shopper. Without a configured backend there is
 * no auth to speak of, so the demo storefront keeps checkout and order history
 * reachable for guests (orders are stored locally).
 */
const ALWAYS_PROTECTED = new Set(['profile']);
const AUTH_BACKED_PROTECTED = new Set(['checkout', 'orders', 'order']);

const TITLES: Record<string, string> = {
  home: 'Skinfinity · Authentic K-Beauty Skincare',
  new: 'New arrivals · Skinfinity',
  category: 'Shop the collection · Skinfinity',
  concern: 'Shop by skin concern · Skinfinity',
  product: 'Skinfinity',
  search: 'Search · Skinfinity',
  cart: 'Your cart · Skinfinity',
  checkout: 'Checkout · Skinfinity',
  order: 'Order confirmation · Skinfinity',
  orders: 'Your orders · Skinfinity',
  wishlist: 'Your wishlist · Skinfinity',
  profile: 'Your profile · Skinfinity',
  login: 'Sign in · Skinfinity',
  info: 'Skinfinity',
  notfound: 'Page not found · Skinfinity',
};

export default function App() {
  const route = useRoute();
  const { user, loading } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    document.title = TITLES[route.page] ?? TITLES.home;
  }, [route.page]);

  // Close the drawer when the user navigates away from the cart route.
  useEffect(() => {
    setCartOpen(false);
  }, [route.path]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <PageLoader label="Loading Skinfinity" />
      </div>
    );
  }

  const needsAuth =
    (ALWAYS_PROTECTED.has(route.page) ||
      (isSupabaseConfigured && AUTH_BACKED_PROTECTED.has(route.page))) &&
    !user;

  const renderPage = () => {
    if (needsAuth) {
      // Preserve where the shopper was heading so sign-in can send them back.
      return <LoginPage redirectTo={route.path} />;
    }

    switch (route.page) {
      case 'home':
        return <HomePage />;
      case 'new':
        return <NewArrivalsPage />;
      case 'category':
        return <CategoryPage categorySlug={route.param ?? ''} />;
      case 'concern':
        return <ConcernPage concernSlug={route.param ?? ''} />;
      case 'product':
        return <ProductPage productSlug={route.param ?? ''} />;
      case 'search':
        return <SearchPage initialQuery={route.query.get('q') ?? ''} />;
      case 'cart':
        return <CartPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order':
        return <OrderConfirmationPage orderId={route.param ?? ''} />;
      case 'orders':
        return <OrdersPage />;
      case 'wishlist':
        return <WishlistPage />;
      case 'profile':
        return <ProfilePage />;
      case 'login':
        return <LoginPage redirectTo={route.query.get('next') ?? undefined} />;
      case 'info':
        return <InfoPage slug={route.param ?? 'help'} />;
      case 'notfound':
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {!isSupabaseConfigured && !bannerDismissed && (
        <div className="flex items-start gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6 lg:px-8">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1">
            <span className="font-semibold">Demo mode.</span> Supabase is not configured, so the
            storefront is serving the bundled sample catalogue and orders are stored in this browser
            only. Copy{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.example</code> to{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env</code> and set{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">VITE_SUPABASE_ANON_KEY</code>{' '}
            to connect a real database.
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Navbar onOpenCart={() => setCartOpen(true)} />

      <main className="flex-1">{renderPage()}</main>

      <Footer />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <Toaster />
    </div>
  );
}
