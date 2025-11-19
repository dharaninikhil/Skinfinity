// src/contexts/WishlistContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Product } from '../lib/supabase';

type WishlistRow = {
  id?: string;
  user_id?: string | null;
  product_id?: string;
  product_json?: any;
  created_at?: string;
};

type WishlistContextValue = {
  items: Array<Product | WishlistRow>;
  isInWishlist: (productId?: string | null) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  loading: boolean;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Array<Product | WishlistRow>>([]);
  const [loading, setLoading] = useState(false);
  const LOCAL_KEY = 'skin_wishlist';

  const emit = useCallback((action: 'add' | 'remove', payload: any) => {
    try {
      window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { action, payload } }));
    } catch {
      /* noop */
    }
  }, []);

  const loadLocal = useCallback(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const saveLocal = useCallback((arr: any[]) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('wishlist saveLocal failed', e);
    }
  }, []);

  // Load wishlist (server for logged-in; local for anonymous)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!user) {
          const local = loadLocal();
          if (mounted) setItems(local);
          return;
        }

        const { data, error } = await supabase
          .from('wishlists')
          .select('id, product_id, product_json, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Wishlist load error', error);
          if (mounted) setItems([]);
        } else {
          if (mounted) setItems(data || []);
        }
      } catch (e) {
        console.error('Wishlist load unexpected error', e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user, loadLocal]);

  const isInWishlist = useCallback(
    (productId?: string | null) => {
      if (!productId) return false;
      return items.some((it) => {
        if (!it) return false;
        // product object
        // @ts-ignore
        if (it.id && it.name) return it.id === productId;
        const r = it as WishlistRow;
        if (r.product_id) return r.product_id === productId;
        if (r.product_json) {
          const pj = typeof r.product_json === 'string' ? (() => { try { return JSON.parse(r.product_json); } catch { return null; } })() : r.product_json;
          return pj?.id === productId;
        }
        return false;
      });
    },
    [items]
  );

  const addToWishlist = useCallback(
    async (product: Product) => {
      if (!product?.id) return;
      // optimistic local update
      setItems((prev) => {
        if (prev.some((it) => {
          // @ts-ignore
          if (it.id && it.name) return it.id === product.id;
          const r = it as WishlistRow;
          if (r.product_id) return r.product_id === product.id;
          if (r.product_json) {
            const pj = typeof r.product_json === 'string' ? (() => { try { return JSON.parse(r.product_json); } catch { return null; } })() : r.product_json;
            return pj?.id === product.id;
          }
          return false;
        })) return prev;
        return [{ ...product }, ...prev];
      });

      emit('add', product);

      if (!user) {
        const cur = loadLocal();
        if (!cur.some((p) => p.id === product.id)) {
          saveLocal([product, ...cur]);
        }
        return;
      }

      try {
        const payload = { user_id: user.id, product_id: product.id, product_json: product };
        const { data, error } = await supabase.from('wishlists').insert([payload]).select().single();
        if (error) {
          console.error('wishlist insert error', error);
          // rollback optimistic
          setItems((prev) => prev.filter((it) => {
            // @ts-ignore
            if (it.id && it.name) return it.id !== product.id;
            const r = it as WishlistRow;
            if (r.product_id) return r.product_id !== product.id;
            if (r.product_json) {
              const pj = typeof r.product_json === 'string' ? (() => { try { return JSON.parse(r.product_json); } catch { return null; } })() : r.product_json;
              return pj?.id !== product.id;
            }
            return true;
          }));
        } else {
          // replace optimistic product with server row (includes id)
          setItems((prev) => {
            const filtered = prev.filter((it) => {
              // @ts-ignore
              if (it.id && it.name) return it.id !== product.id;
              const r = it as WishlistRow;
              if (r.product_id) return r.product_id !== product.id;
              if (r.product_json) {
                const pj = typeof r.product_json === 'string' ? (() => { try { return JSON.parse(r.product_json); } catch { return null; } })() : r.product_json;
                return pj?.id !== product.id;
              }
              return true;
            });
            return [data as WishlistRow, ...filtered];
          });
        }
      } catch (e) {
        console.error('addToWishlist unexpected error', e);
      }
    },
    [user, emit, loadLocal, saveLocal]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (!productId) return;
      setItems((prev) =>
        prev.filter((it) => {
          // @ts-ignore
          if (it.id && it.name) return it.id !== productId;
          const r = it as WishlistRow;
          if (r.product_id) return r.product_id !== productId;
          if (r.product_json) {
            const pj = typeof r.product_json === 'string' ? (() => { try { return JSON.parse(r.product_json); } catch { return null; } })() : r.product_json;
            return pj?.id !== productId;
          }
          return true;
        })
      );

      emit('remove', { product_id: productId });

      if (!user) {
        const cur = loadLocal();
        saveLocal(cur.filter((p) => p.id !== productId));
        return;
      }

      try {
        const { error } = await supabase.from('wishlists').delete().match({ user_id: user.id, product_id: productId });
        if (error) {
          console.error('wishlist delete error', error);
          // reload to resync
          const { data } = await supabase.from('wishlists').select('id, product_id, product_json, created_at').eq('user_id', user.id);
          setItems(data || []);
        }
      } catch (e) {
        console.error('removeFromWishlist unexpected error', e);
      }
    },
    [user, emit, loadLocal, saveLocal]
  );

  const toggleWishlist = useCallback(
    async (product: Product) => {
      if (!product?.id) return;
      if (isInWishlist(product.id)) await removeFromWishlist(product.id);
      else await addToWishlist(product);
    },
    [addToWishlist, removeFromWishlist, isInWishlist]
  );

  return (
    <WishlistContext.Provider value={{ items, isInWishlist, toggleWishlist, addToWishlist, removeFromWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}
