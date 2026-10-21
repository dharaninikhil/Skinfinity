// src/contexts/WishlistContext.tsx
//
// Wishlist state. Anonymous users get a localStorage-backed list; signed-in
// users get the `wishlists` table, with the local list merged upwards on login.
//
// Consumers always see a normalised `Product[]` — the previous version leaked
// raw rows (and their `product_json` string/object ambiguity) into the pages,
// which is why WishlistPage needed its own extraction logic.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  addWishlistItem,
  AppError,
  clearWishlistForUser,
  fetchProductsByIds,
  fetchWishlist,
  removeWishlistItem,
  type Product,
  type WishlistRow,
} from '../lib/supabase';

export type WishlistContextValue = {
  /** Normalised products, newest first. */
  items: Product[];
  count: number;
  loading: boolean;
  isInWishlist: (productId?: string | null) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
};

const STORAGE_KEY = 'skinfinity_wishlist_v2';
const LEGACY_KEY = 'skin_wishlist';

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Product>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

/** `product_json` may be stored as an object or as a JSON string. */
function parseSnapshot(raw: WishlistRow['product_json']): Product | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isProduct(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isProduct(raw) ? raw : null;
}

function readLocal(): Product[] {
  if (typeof window === 'undefined') return [];
  for (const key of [STORAGE_KEY, LEGACY_KEY]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      const products = parsed.filter(isProduct);
      if (products.length > 0 || key === STORAGE_KEY) return products;
    } catch {
      // try the next key
    }
  }
  return [];
}

function writeLocal(products: Product[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // ignore quota/private-browsing failures
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? null;

  const [items, setItems] = useState<Product[]>(() => readLocal());
  const [loading, setLoading] = useState(true);

  const itemsRef = useRef<Product[]>(items);
  itemsRef.current = items;
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  const commit = useCallback((next: Product[]) => {
    itemsRef.current = next;
    setItems(next);
    if (!userIdRef.current) writeLocal(next);
  }, []);

  /** Fill in products we only have an id for (rows saved without a snapshot). */
  const resolveMissing = useCallback(async (rows: WishlistRow[]) => {
    const missing = rows.filter((row) => !parseSnapshot(row.product_json)).map((row) => row.product_id);
    if (missing.length === 0) return new Map<string, Product>();
    try {
      const products = await fetchProductsByIds(missing.filter(Boolean));
      return new Map(products.map((p) => [p.id, p]));
    } catch {
      return new Map<string, Product>();
    }
  }, []);

  /* -------------------------------- loading ------------------------------- */

  const load = useCallback(async () => {
    if (!userId) {
      commit(readLocal());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Merge anything saved while signed out, then read the server list.
      const local = readLocal();
      for (const product of local) {
        try {
          await addWishlistItem(userId, product);
        } catch {
          // Skip rows the server rejects; the server list below wins.
        }
      }

      const rows = await fetchWishlist(userId);
      const resolved = await resolveMissing(rows);

      const products: Product[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        const product = parseSnapshot(row.product_json) ?? resolved.get(row.product_id);
        if (!product || seen.has(product.id)) continue;
        seen.add(product.id);
        products.push(product);
      }

      commit(products);
      // The local list now lives on the server; stop mirroring it locally.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'NOT_CONFIGURED')) {
        toast(err instanceof Error ? err.message : 'Could not load your wishlist.', 'error');
      }
      commit([]);
    } finally {
      setLoading(false);
    }
  }, [commit, resolveMissing, toast, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------ mutations ------------------------------- */

  const isInWishlist = useCallback(
    (productId?: string | null) => Boolean(productId) && items.some((item) => item.id === productId),
    [items]
  );

  const addToWishlist = useCallback(
    async (product: Product) => {
      if (!product?.id) return;
      if (itemsRef.current.some((item) => item.id === product.id)) return;

      // Optimistic, rolled back if the server write fails.
      commit([product, ...itemsRef.current]);

      if (!userIdRef.current) return;

      try {
        await addWishlistItem(userIdRef.current, product);
      } catch (err) {
        commit(itemsRef.current.filter((item) => item.id !== product.id));
        toast(err instanceof Error ? err.message : 'Could not save to your wishlist.', 'error');
      }
    },
    [commit, toast]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (!productId) return;
      const previous = itemsRef.current;
      if (!previous.some((item) => item.id === productId)) return;

      commit(previous.filter((item) => item.id !== productId));

      if (!userIdRef.current) return;

      try {
        await removeWishlistItem(userIdRef.current, productId);
      } catch (err) {
        commit(previous);
        toast(err instanceof Error ? err.message : 'Could not remove that item.', 'error');
      }
    },
    [commit, toast]
  );

  const toggleWishlist = useCallback(
    async (product: Product) => {
      if (!product?.id) return;
      if (itemsRef.current.some((item) => item.id === product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product);
      }
    },
    [addToWishlist, removeFromWishlist]
  );

  const clearWishlist = useCallback(async () => {
    const previous = itemsRef.current;
    if (previous.length === 0) return;

    commit([]);

    if (!userIdRef.current) return;

    try {
      await clearWishlistForUser(userIdRef.current);
    } catch (err) {
      commit(previous);
      toast(err instanceof Error ? err.message : 'Could not clear your wishlist.', 'error');
    }
  }, [commit, toast]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      count: items.length,
      loading,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
    }),
    [addToWishlist, clearWishlist, isInWishlist, items, loading, removeFromWishlist, toggleWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
