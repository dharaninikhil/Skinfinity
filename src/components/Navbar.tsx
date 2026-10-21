// src/components/Navbar.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useCatalog } from '../hooks/useCatalog';
import { useNavigate, useRoute } from '../hooks/useRoute';
import { dedupeKey } from '../lib/format';

type NavbarProps = {
  /** Opens the shared cart drawer owned by the app shell. */
  onOpenCart: () => void;
};

/** Closes a dropdown when the user clicks or tabs outside of it. */
function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return ref;
}

function Badge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 min-w-[1.15rem] rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-[1.15rem] text-white"
      aria-label={`${count} ${label}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Navbar({ onOpenCart }: NavbarProps) {
  const navigate = useNavigate();
  const route = useRoute();
  const { totalItems, syncing } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, profile, signOut } = useAuth();
  const { categories, concerns } = useCatalog();

  const [term, setTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [concernOpen, setConcernOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const shopRef = useDismiss<HTMLDivElement>(shopOpen, () => setShopOpen(false));
  const concernRef = useDismiss<HTMLDivElement>(concernOpen, () => setConcernOpen(false));
  const accountRef = useDismiss<HTMLDivElement>(accountOpen, () => setAccountOpen(false));

  // Collapse the menus whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
    setShopOpen(false);
    setConcernOpen(false);
    setAccountOpen(false);
  }, [route.path]);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    setTerm('');
  };

  const handleSignOut = async () => {
    setAccountOpen(false);
    try {
      await signOut();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  const go = (to: string) => () => navigate(to);

  const iconButton =
    'relative inline-flex items-center justify-center rounded-full p-2 text-gray-700 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      {/* Announcement */}
      <div className="bg-gray-900 px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-gray-100 sm:text-xs">
        Free shipping across India on orders over ₹1,499 · Authentic K-beauty, direct from Seoul
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className={`${iconButton} lg:hidden`}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Brand */}
          <button
            type="button"
            onClick={go('home')}
            className="flex shrink-0 items-center gap-2 focus:outline-none"
            aria-label="Skinfinity home"
          >
            <Sparkles className="h-5 w-5 text-rose-600" />
            <span className="text-xl font-bold italic tracking-wide text-gray-900">SKINFINITY</span>
          </button>

          {/* Desktop nav */}
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
            <div className="relative" ref={shopRef}>
              <button
                type="button"
                onClick={() => setShopOpen((v) => !v)}
                aria-expanded={shopOpen}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Shop
                <ChevronDown className={`h-4 w-4 transition ${shopOpen ? 'rotate-180' : ''}`} />
              </button>

              {shopOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={go('new')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Sparkles className="h-4 w-4" /> New arrivals
                  </button>
                  <div className="my-1 h-px bg-gray-100" />
                  {categories
                    .filter((c) => dedupeKey(c.slug ?? c.name) !== 'new')
                    .map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={go(`category-${category.slug ?? category.name}`)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {category.name}
                      </button>
                    ))}
                  {categories.length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-400">No categories yet</p>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={concernRef}>
              <button
                type="button"
                onClick={() => setConcernOpen((v) => !v)}
                aria-expanded={concernOpen}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Skin concerns
                <ChevronDown className={`h-4 w-4 transition ${concernOpen ? 'rotate-180' : ''}`} />
              </button>

              {concernOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
                  {concerns.map((concern) => (
                    <button
                      key={concern.id}
                      type="button"
                      onClick={go(`concern-${concern.slug ?? concern.name}`)}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {concern.name}
                    </button>
                  ))}
                  {concerns.length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-400">No concerns yet</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={go('new')}
              className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              New
            </button>
          </nav>

          {/* Search (desktop) */}
          <form onSubmit={submitSearch} className="ml-auto hidden w-full max-w-xs md:block" role="search">
            <label htmlFor="nav-search" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="nav-search"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm transition focus:border-rose-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 md:ml-3">
            <button
              type="button"
              onClick={go('search')}
              className={`${iconButton} md:hidden`}
              aria-label="Search products"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={go('wishlist')}
              className={iconButton}
              aria-label={`Wishlist, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}`}
            >
              <Heart className={`h-5 w-5 ${wishlistCount > 0 ? 'fill-rose-100 text-rose-600' : ''}`} />
              <Badge count={wishlistCount} label="saved items" />
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className={iconButton}
              aria-label={`Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
            >
              <ShoppingCart className="h-5 w-5" />
              <Badge count={totalItems} label="items in cart" />
              {syncing && <span className="absolute -bottom-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
            </button>

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => (user ? setAccountOpen((v) => !v) : navigate('login'))}
                className={iconButton}
                aria-label={user ? 'Account menu' : 'Sign in'}
                aria-expanded={user ? accountOpen : undefined}
              >
                <User className="h-5 w-5" />
              </button>

              {user && accountOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {profile?.full_name || user.email?.split('@')[0] || 'Your account'}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="my-1 h-px bg-gray-100" />
                  <button
                    type="button"
                    onClick={go('profile')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" /> Profile
                  </button>
                  <button
                    type="button"
                    onClick={go('orders')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Package className="h-4 w-4" /> Orders
                  </button>
                  <button
                    type="button"
                    onClick={go('wishlist')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Heart className="h-4 w-4" /> Wishlist
                  </button>
                  <div className="my-1 h-px bg-gray-100" />
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <form onSubmit={submitSearch} className="mb-4" role="search">
              <label htmlFor="mobile-search" className="sr-only">
                Search products
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="mobile-search"
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm focus:border-rose-300 focus:bg-white focus:outline-none"
                />
              </div>
            </form>

            <nav className="space-y-1" aria-label="Mobile">
              <MobileLink label="New arrivals" onClick={go('new')} />
              <MobileLink label="Cart" onClick={onOpenCart} trailing={totalItems > 0 ? String(totalItems) : undefined} />
              <MobileLink label="Wishlist" onClick={go('wishlist')} trailing={wishlistCount > 0 ? String(wishlistCount) : undefined} />
              <MobileLink
                label={user ? 'Your profile' : 'Sign in'}
                onClick={go(user ? 'profile' : 'login')}
              />
              {user && <MobileLink label="Orders" onClick={go('orders')} />}

              <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Categories</p>
              <div className="grid grid-cols-2 gap-1">
                {categories
                  .filter((c) => dedupeKey(c.slug ?? c.name) !== 'new')
                  .map((category) => (
                    <MobileLink
                      key={category.id}
                      label={category.name}
                      onClick={go(`category-${category.slug ?? category.name}`)}
                    />
                  ))}
              </div>

              <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Skin concerns</p>
              <div className="grid grid-cols-2 gap-1">
                {concerns.map((concern) => (
                  <MobileLink
                    key={concern.id}
                    label={concern.name}
                    onClick={go(`concern-${concern.slug ?? concern.name}`)}
                  />
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileLink({
  label,
  onClick,
  trailing,
}: {
  label: string;
  onClick: () => void;
  trailing?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-gray-800 transition hover:bg-rose-50"
    >
      <span className="flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-rose-500/70" aria-hidden />
        {label}
      </span>
      {trailing && <span className="text-xs font-semibold text-rose-600">{trailing}</span>}
    </button>
  );
}
