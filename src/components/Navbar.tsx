// src/components/Navbar.tsx
import React, { useEffect, useState } from 'react';
import { ShoppingCart, User, Heart, Search } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';

type NavbarProps = {
  onNavigate: (page: string) => void;
  currentPage?: string;
};

export default function Navbar({ onNavigate }: NavbarProps) {
  const { totalItems } = useCart();
  const { user } = useAuth();
  const { items } = useWishlist(); // ensure provider above
  const [query, setQuery] = useState('');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const handler = () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 650);
    };
    window.addEventListener('wishlist:changed', handler as EventListener);
    return () => window.removeEventListener('wishlist:changed', handler as EventListener);
  }, []);

  const wishlistCount = items ? items.length : 0;

  const submitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) onNavigate('search');
    else onNavigate(`search-${encodeURIComponent(q)}`);
    setQuery('');
  };

  return (
    <>
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-16 flex items-center">
            <div className="flex items-center gap-3 w-1/3">
              <button
                onClick={() => onNavigate(user ? 'profile' : 'login')}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition"
              >
                <User className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={() => onNavigate('search')}
                className="flex md:hidden items-center px-2 py-2 rounded-md hover:bg-gray-50 transition"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>

              <form onSubmit={submitSearch} className="hidden md:flex w-full">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 rounded-full border text-sm focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </form>
            </div>

            <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
              <button
                onClick={() => onNavigate('home')}
                className="pointer-events-auto text-2xl font-bold italic tracking-wider text-gray-900 hover:text-gray-600 transition"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                SKINFINITY
              </button>
            </div>

            <div className="ml-auto flex items-center gap-3 w-1/3 justify-end">
              <button
                onClick={() => onNavigate('wishlist')}
                className={`hidden sm:flex items-center px-3 py-2 rounded-md hover:bg-gray-50 transition relative ${pulse ? 'animate-pulse' : ''}`}
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5 text-gray-700" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigate('cart')}
                className="hidden sm:flex items-center px-3 py-2 rounded-md hover:bg-gray-50 transition relative"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <button
        onClick={() => onNavigate('checkout')}
        className="fixed bottom-4 right-4 z-50 md:hidden flex items-center gap-2 bg-rose-600 text-white shadow-lg px-4 py-3 rounded-full"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-sm font-semibold">Checkout</span>

        {totalItems > 0 && (
          <span className="ml-2 bg-white text-rose-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {totalItems}
          </span>
        )}
      </button>
    </>
  );
}
