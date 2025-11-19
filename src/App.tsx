import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import CategoryPage from './pages/CategoryPage';
import ConcernPage from './pages/ConcernPage';
import LoginPage from './pages/LoginPage';
import WishlistPage from './pages/WishlistPage';

export default function App() {
  const [page, setPage] = useState<string>('home');
  const [pageParam, setPageParam] = useState<string | undefined>(undefined);

  const { loading } = useAuth();

  const onNavigate = (to: string) => {
    const [base, ...rest] = to.split('-');
    if (base === 'category') {
      setPage('category');
      setPageParam(rest.join('-'));
    } else if (base === 'concern') {
      setPage('concern');
      setPageParam(rest.join('-'));
    } else {
      setPage(to);
      setPageParam(undefined);
    }
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          <p className="mt-4 text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar onNavigate={onNavigate} currentPage={page} />
      {page === 'home' && <HomePage onNavigate={onNavigate} />}
      {page === 'new' && <HomePage onNavigate={onNavigate} />}
      {page === 'cart' && <CartPage onNavigate={onNavigate} />}
      {page === 'wishlist' && <WishlistPage />}
      {page === 'profile' && <ProfilePage onNavigate={onNavigate} />}
      {page === 'login' && <LoginPage onNavigate={onNavigate} />}
      {page === 'category' && pageParam && <CategoryPage categorySlug={pageParam} />}
      {page === 'concern' && pageParam && <ConcernPage concernSlug={pageParam} />}
    </div>
  );
}
