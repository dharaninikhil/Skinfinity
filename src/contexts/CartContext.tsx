// src/contexts/CartContext.tsx
//
// Local-first cart with server sync for signed-in users.
//
// Previous behaviour had three defects this rewrite fixes:
//  1. Product snapshots lived only in a `useRef`, so after a page reload the
//     cart rendered "Product", ₹0 and a broken image.
//  2. Pages read/wrote a *different* localStorage key (`skin_cart`) than the
//     provider (`skinfinity_cart_v2`), so badges desynced and writes were lost.
//  3. The `cart_items` table existed but was never touched, so signed-in users
//     had no server cart and nothing was merged on login.
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
  AppError,
  clearServerCart,
  fetchCartItems,
  fetchProductsByIds,
  mergeLocalCartIntoServer,
  upsertCartItem,
  type Product,
} from '../lib/supabase';
import { toNumber } from '../lib/format';

/** A cart line: quantity plus a persisted snapshot of the product. */
export type CartEntry = {
  product: Product;
  qty: number;
};

/** Persisted shape (versioned so we can migrate without losing carts). */
type PersistedCart = {
  version: 3;
  items: Record<string, { qty: number; product?: Product }>;
};

type CartState = Record<string, { qty: number; product?: Product }>;

export type CartContextType = {
  /** id -> quantity. Kept for components that only need counts. */
  cartItems: Record<string, number>;
  /** Full lines with product snapshots, for rendering. */
  cartArray: CartEntry[];
  totalItems: number;
  subtotal: number;
  /** True while the initial load (local + server) is in flight. */
  hydrating: boolean;
  /** True while a server write is pending. */
  syncing: boolean;
  addItem: (product: Product, qty?: number) => Promise<void>;
  removeItem: (product: Product, qty?: number) => Promise<void>;
  setQuantity: (productId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Re-read the cart from the server. */
  refresh: () => Promise<void>;
};

const STORAGE_KEY = 'skinfinity_cart_v3';
/** Keys written by earlier revisions; read once for migration. */
const LEGACY_KEYS = ['skinfinity_cart_v2', 'skin_cart'];
/** Hard ceiling when a product has no known stock. */
const MAX_UNKNOWN_STOCK = 99;
/** Coalesce rapid quantity edits into one server write. */
const WRITE_DEBOUNCE_MS = 350;

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Clamp to a sane, positive integer, never exceeding known stock. */
function safeQty(value: number, max?: number | null): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (max !== null && max !== undefined && Number.isFinite(Number(max))) {
    return Math.min(n, Math.max(0, Math.floor(Number(max))));
  }
  return Math.min(n, MAX_UNKNOWN_STOCK);
}

function readPersisted(): CartState {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedCart;
      if (parsed && typeof parsed === 'object' && parsed.items) {
        const next: CartState = {};
        for (const [id, entry] of Object.entries(parsed.items)) {
          const qty = safeQty(toNumber(entry?.qty), entry?.product?.stock_quantity ?? null);
          if (qty > 0) next[id] = { qty, product: entry?.product };
        }
        return next;
      }
    }
  } catch {
    // Corrupt payload — fall through to legacy migration.
  }

  // Migrate the flat `id -> qty` maps written by older builds.
  const migrated: CartState = {};
  for (const key of LEGACY_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') continue;
      for (const [id, qty] of Object.entries(parsed)) {
        const q = safeQty(toNumber(qty));
        if (q > 0) migrated[id] = { qty: Math.max(migrated[id]?.qty ?? 0, q) };
      }
    } catch {
      // ignore unreadable legacy entries
    }
  }
  return migrated;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? null;

  const [state, setState] = useState<CartState>(() => readPersisted());
  const [hydrating, setHydrating] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /**
   * Mirror of `state` that is updated synchronously. React state updaters run
   * later (and twice under StrictMode), so computing the next quantity from
   * `setState`'s callback would give stale values to the server write.
   */
  const stateRef = useRef<CartState>(state);

  const commit = useCallback((next: CartState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** Debounce timers for server writes, keyed by product id. */
  const pending = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  /* ------------------------------ persistence ----------------------------- */

  useEffect(() => {
    try {
      const payload: PersistedCart = { version: 3, items: state };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing / quota — the in-memory cart still works this session.
    }
  }, [state]);

  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  /* ---------------------------- product hydrator --------------------------- */

  /**
   * Lines migrated from a legacy key have a quantity but no snapshot. Fetch the
   * missing products once so names, prices and images render after a reload.
   */
  const hydrateMissingSnapshots = useCallback(async () => {
    const missing = Object.entries(stateRef.current)
      .filter(([, entry]) => !entry.product)
      .map(([id]) => id);
    if (missing.length === 0) return;

    try {
      const products = await fetchProductsByIds(missing);
      if (products.length === 0) return;
      const byId = new Map(products.map((p) => [p.id, p]));
      const next: CartState = { ...stateRef.current };
      let changed = false;
      for (const [id, entry] of Object.entries(next)) {
        const product = byId.get(id);
        if (product && !entry.product) {
          next[id] = { ...entry, product };
          changed = true;
        }
      }
      if (changed) commit(next);
    } catch {
      // Non-fatal: the cart still works, it just shows placeholders.
    }
  }, [commit]);

  /* ------------------------------ server sync ----------------------------- */

  const loadServerCart = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) {
      setHydrating(false);
      return;
    }

    setHydrating(true);
    setSyncing(true);
    try {
      // Push the guest cart up first, then treat the server as the source of truth.
      const guestCart: Record<string, number> = Object.fromEntries(
        Object.entries(stateRef.current).map(([id, entry]) => [id, entry.qty])
      );

      const { skipped } = await mergeLocalCartIntoServer(currentUserId, guestCart);
      if (skipped.length > 0) {
        toast(
          `${skipped.length} cart line${skipped.length === 1 ? ' was' : 's were'} adjusted to match available stock.`,
          'info'
        );
      }

      const rows = await fetchCartItems(currentUserId);
      const next: CartState = {};
      for (const row of rows) {
        const qty = safeQty(row.quantity, row.product?.stock_quantity ?? null);
        if (qty <= 0) continue;
        // Prefer the fresh server product; keep a local snapshot as a fallback.
        next[row.product_id] = { qty, product: row.product ?? stateRef.current[row.product_id]?.product };
      }
      commit(next);
    } catch (err) {
      // Offline or unconfigured Supabase: keep the guest cart usable.
      if (err instanceof AppError && err.code === 'NOT_CONFIGURED') {
        await hydrateMissingSnapshots();
      } else {
        toast(err instanceof Error ? err.message : 'Could not sync your cart.', 'error');
        await hydrateMissingSnapshots();
      }
    } finally {
      setSyncing(false);
      setHydrating(false);
    }
  }, [commit, hydrateMissingSnapshots, toast]);

  // Initial load, and re-sync whenever the signed-in user changes.
  useEffect(() => {
    if (userId) {
      void loadServerCart();
    } else {
      setHydrating(false);
      void hydrateMissingSnapshots();
    }
  }, [userId, loadServerCart, hydrateMissingSnapshots]);

  /* -------------------------------- writes -------------------------------- */

  /** Persist a line to the server (debounced) when signed in. */
  const pushToServer = useCallback(
    (productId: string, quantity: number) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;

      const existing = pending.current.get(productId);
      if (existing) clearTimeout(existing);

      pending.current.set(
        productId,
        setTimeout(async () => {
          pending.current.delete(productId);
          setSyncing(true);
          try {
            await upsertCartItem(currentUserId, productId, quantity);
          } catch (err) {
            if (err instanceof AppError && err.code === 'OUT_OF_STOCK') {
              const available = err.available ?? 0;
              const next = { ...stateRef.current };
              const entry = next[productId];
              if (entry) {
                if (available <= 0) delete next[productId];
                else next[productId] = { ...entry, qty: available };
                commit(next);
              }
              toast(err.message, 'error');
            } else if (err instanceof AppError && err.code === 'NOT_CONFIGURED') {
              // ignore — the guest cart keeps working
            } else {
              toast(err instanceof Error ? err.message : 'Could not update your cart.', 'error');
            }
          } finally {
            setSyncing(false);
          }
        }, WRITE_DEBOUNCE_MS)
      );
    },
    [commit, toast]
  );

  const addItem = useCallback(
    async (product: Product, qty = 1) => {
      if (!product?.id) return;

      const stock = product.stock_quantity ?? null;
      if (stock !== null && toNumber(stock) <= 0) {
        toast(`${product.name} is out of stock.`, 'error');
        return;
      }

      const entry = stateRef.current[product.id];
      const currentQty = entry?.qty ?? 0;
      const nextQty = safeQty(currentQty + qty, stock);

      if (nextQty === currentQty) {
        if (qty > 0 && stock !== null) toast(`Only ${toNumber(stock)} in stock for ${product.name}.`, 'info');
        return;
      }

      // Keep the richer snapshot (a fresh product object wins over a stub).
      const snapshot = product.name ? product : entry?.product ?? product;
      commit({ ...stateRef.current, [product.id]: { qty: nextQty, product: snapshot } });
      pushToServer(product.id, nextQty);
    },
    [commit, pushToServer, toast]
  );

  const removeItem = useCallback(
    async (product: Product, qty = 1) => {
      if (!product?.id) return;
      const entry = stateRef.current[product.id];
      if (!entry) return;

      const nextQty = entry.qty - qty;
      const next = { ...stateRef.current };
      if (nextQty <= 0) delete next[product.id];
      else next[product.id] = { ...entry, qty: nextQty };

      commit(next);
      pushToServer(product.id, Math.max(0, nextQty));
    },
    [commit, pushToServer]
  );

  const setQuantity = useCallback(
    async (productId: string, qty: number) => {
      if (!productId) return;
      const entry = stateRef.current[productId];
      if (!entry) return;

      const nextQty = safeQty(qty, entry.product?.stock_quantity ?? null);
      const next = { ...stateRef.current };
      if (nextQty <= 0) delete next[productId];
      else next[productId] = { ...entry, qty: nextQty };

      commit(next);
      pushToServer(productId, nextQty);
    },
    [commit, pushToServer]
  );

  const clearCart = useCallback(async () => {
    pending.current.forEach((t) => clearTimeout(t));
    pending.current.clear();
    commit({});

    const currentUserId = userIdRef.current;
    if (!currentUserId) return;

    setSyncing(true);
    try {
      await clearServerCart(currentUserId);
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'NOT_CONFIGURED')) {
        toast(err instanceof Error ? err.message : 'Could not clear your cart on the server.', 'error');
      }
    } finally {
      setSyncing(false);
    }
  }, [commit, toast]);

  const refresh = useCallback(async () => {
    if (userIdRef.current) await loadServerCart();
    else await hydrateMissingSnapshots();
  }, [hydrateMissingSnapshots, loadServerCart]);

  /* ------------------------------- selectors ------------------------------ */

  const cartItems = useMemo<Record<string, number>>(
    () => Object.fromEntries(Object.entries(state).map(([id, entry]) => [id, entry.qty])),
    [state]
  );

  const cartArray = useMemo<CartEntry[]>(
    () =>
      Object.entries(state).map(([id, entry]) => ({
        // Fall back to a stub so a line can still be removed if its snapshot is gone.
        product: entry.product ?? ({ id, name: 'Unavailable product', price: 0 } as Product),
        qty: entry.qty,
      })),
    [state]
  );

  const totalItems = useMemo(
    () => Object.values(state).reduce((sum, entry) => sum + entry.qty, 0),
    [state]
  );

  const subtotal = useMemo(
    () => cartArray.reduce((sum, { product, qty }) => sum + toNumber(product.price) * qty, 0),
    [cartArray]
  );

  const value: CartContextType = {
    cartItems,
    cartArray,
    totalItems,
    subtotal,
    hydrating,
    syncing,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
    refresh,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
