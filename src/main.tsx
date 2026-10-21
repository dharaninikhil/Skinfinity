// src/main.tsx
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CartProvider } from './contexts/CartContext';
import App from './App';
import './index.css';

// Provider order matters: toasts are consumed by auth, and auth is consumed by
// the wishlist and cart providers (both sync to the server per user).
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found — check index.html.');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>
);
