<!-- Repository-specific guidance for AI coding agents. Keep concise and actionable. -->
# Copilot / AI Agent Instructions

Purpose: help AI contributors understand this codebase quickly — architecture, key patterns, developer workflows and integration points.

## Quick start

```bash
npm install
cp .env.example .env    # optional: the app runs in demo mode without it
npm run dev             # http://localhost:5173 (binds 0.0.0.0)
npm run check           # typecheck + lint + test + build — run before committing
```

| Task | Command |
| --- | --- |
| Typecheck | `npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`) |
| Lint | `npm run lint` |
| Tests | `npm test` (single run) / `npm run test:watch` |
| Build | `npm run build` (typechecks, then `vite build`) |
| Regenerate demo catalogue | `npm run gen:demo` |

**Node 22+ required** — `.nvmrc` pins it and CI reads it via `node-version-file`. See Gotchas.

## Big picture

- React 18 + TypeScript + Vite + Tailwind. Entry: `src/main.tsx` → `src/App.tsx`.
- Provider tree (order matters): `ToastProvider` → `AuthProvider` → `WishlistProvider` → `CartProvider` → `App`. Cart and wishlist both depend on auth; auth depends on toasts.
- **No router dependency.** `src/lib/router.ts` parses/builds URLs on the History API; `useRoute()` and `useNavigate()` (in `src/hooks/useRoute.ts`) expose it. `App.tsx` is a `switch` on `route.page`.
- Backend is Supabase (Postgres + Auth + RLS). Migrations live in `supabase/migrations/`.

### Routes

`/`, `/new`, `/category/:slug`, `/concern/:slug`, `/product/:slug`, `/search?q=`, `/cart`, `/checkout`, `/order/:id`, `/orders`, `/wishlist`, `/profile`, `/login`, `/info/:slug`, else 404.

`navigate()` also accepts legacy dash tokens (`category-cleanser`, `search-vitamin%20c`, `terms`) and translates them via `tokenToPath`. `/profile` always requires a session; `/checkout`, `/orders`, `/order/:id` require one only when Supabase is configured.

## Data layer

**All Supabase access goes through `src/lib/supabase.ts`.** Do not build queries inside components.

- Row types: `Product`, `Category`, `SkinConcern`, `Profile`, `CartItemRow`, `WishlistRow`, `Order`, `OrderItemRow`, `ShippingAddress`, `CheckoutLine`.
- Catalogue: `fetchCategories`, `fetchConcerns`, `fetchNewArrivals`, `fetchFeaturedProducts`, `fetchProductsByCategorySlug`, `fetchProductsByConcernSlug`, `fetchProductBySlug`, `fetchProductById`, `fetchProductsByIds`, `fetchRelatedProducts`, `searchProducts`, `resolveCategory`, `resolveConcern`.
- Cart: `getOrCreateCartForUser`, `fetchCartItems`, `upsertCartItem`, `mergeLocalCartIntoServer`, `clearServerCart`.
- Wishlist: `fetchWishlist`, `addWishlistItem`, `removeWishlistItem`, `clearWishlistForUser`.
- Orders: `placeOrder` (RPC), `fetchOrders`, `fetchOrderById`.
- Profile: `fetchProfile`, `updateProfile`. Newsletter: `subscribeNewsletter`.

Errors are thrown as `AppError` with a `code` (`OUT_OF_STOCK` + `.available`, `NOT_FOUND`, `UNAUTHENTICATED`, `NOT_CONFIGURED`). Branch on `code`, never on the message.

`PRODUCT_SELECT` joins `category:categories(...)` and `concerns:product_concerns(skin_concerns(...))` so grids do not issue a query per card. `normalizeProduct()` flattens that nested join once.

### Demo mode

`isSupabaseConfigured` is false when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing. Every read helper starts with `if (!isSupabaseConfigured) return demo…()` and is served by `src/lib/demoApi.ts` from `src/lib/demoData.ts`. Guest carts/wishlists stay in `localStorage`; demo orders are stored locally too.

`src/lib/demoData.ts` is **generated** from `supabase/migrations/20251116150400_seed_products.sql` by `scripts/generate-demo-data.mjs`. Never hand-edit it — edit the migration and run `npm run gen:demo`. CI fails if it is out of date, and `src/lib/demoData.test.ts` asserts the two stay in sync.

## Key patterns

- **Navigation:** `const navigate = useNavigate(); navigate('/category/cleanser')` or `navigate('category-cleanser')`. Read the current route with `useRoute()`.
- **Cart:** local-first. Persisted under `skinfinity_cart_v3` **with product snapshots** so prices/names/images survive a reload; `skinfinity_cart_v2` and `skin_cart` are migrated on load. On sign-in the guest cart is merged into `cart_items` and the server becomes authoritative. Writes are debounced per product; `OUT_OF_STOCK` rolls the line back to `err.available` and raises a toast.
- **State updates:** `CartContext` and `WishlistContext` keep a `stateRef` mirror updated synchronously, because React state updaters run later (and twice under `StrictMode`) — never compute a value inside a `setState` callback and read it afterwards.
- **Stock:** `upsertCartItem` re-checks `products.stock_quantity` server-side and throws `OUT_OF_STOCK`. Client clamping is UX only, never the guard.
- **Checkout:** `place_order()` is a `SECURITY DEFINER` Postgres function that locks product rows, validates stock, prices the order, writes `orders`/`order_items`, decrements stock and clears the cart atomically. Totals must never be computed client-side and trusted. Pricing thresholds are duplicated in `src/lib/checkout.ts` and in the function — **change both**.
- **Images:** resolve through `src/lib/images.ts` (`productImage`, `categoryImage`, `concernImage`, `fallbackTo`). It maps slug aliases (`lip-care` → `lipcare.jpeg`) and falls back to branded placeholders in `public/assets/`.
- **Static assets must live in `public/`.** Vite only copies `public/` into `dist/`; the dev server will happily serve files from the repo root, so a misplaced asset looks fine locally and 404s in production. CI asserts the built assets exist.
- **Prices:** Postgres `decimal` arrives as a string. Always `toNumber()` before arithmetic, `formatINR()` before display.
- **Styling:** Tailwind utilities inline. Shared primitives (`Button`, `Spinner`, `PageLoader`, `EmptyState`, `DiscountBadge`) live in `src/components/ui.tsx`.
- **Product tiles:** use `src/components/ProductCard.tsx` inside `ProductGrid`. It is self-contained (reads cart/wishlist/router from context) — do not fork per-page markup, which is how the pages originally drifted apart.
- **Listing pages:** use `src/components/CollectionGrid.tsx`, which owns sort, loading, error, empty and breadcrumb state. `CategoryPage`/`ConcernPage`/`NewArrivalsPage` are thin wrappers supplying a `load(sort)` function.
- **Icons:** `lucide-react` (excluded from `optimizeDeps` in `vite.config.ts`). Do not add other UI or icon packages.
- **Feedback:** `useToast()` for anything the shopper must notice. Destructure the stable `toast(message, tone)` function; the other helpers are recreated when the toast list changes.

## Database

Column naming is **snake_case** (`skin_type`, `stock_quantity`, `compare_at_price`).

| Table | Notes |
| --- | --- |
| `categories`, `skin_concerns`, `products`, `product_concerns` | Public read |
| `profiles` | Created by the `handle_new_user` trigger on `auth.users`; users read/update their own |
| `cart_items` | Per-user, `UNIQUE(user_id, product_id)` — there is no cart header row |
| `wishlists` | Per-user, `UNIQUE(user_id, product_id)`, stores a `product_json` snapshot |
| `orders`, `order_items` | Read-only to the owner; written only by `place_order()` |
| `newsletter_subscribers` | Insert-only for `anon` and `authenticated` — no read policy |

Migrations are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `DROP POLICY IF EXISTS`), so they can be re-applied safely.

## Gotchas

- `slugVariants()` (in `src/lib/format.ts`) tolerates slug drift between seed data and asset filenames (`sensitive-skin` vs `sensitive`, `lip-care` vs `lipcare`). Migration `20251116150000` normalises the database slugs; keep both in mind when adding a category or concern.
- New categories/concerns need an entry in the image maps in `src/lib/images.ts`, plus a file in `public/assets/`.
- **Node version is load-bearing.** jsdom → undici calls `zlib.createZstdDecompress` at import time; it does not exist before Node 22.22.2, so on Node 20 the jsdom worker dies with `TypeError: Cannot read properties of undefined (reading 'bind')` from inside `node_modules/undici` and Vitest reports it as an *unhandled* error (no test in `src/App.test.tsx` runs). npm only warns about `engines`, never fails — `scripts/check-node.mjs` runs as a `pretest`/`pretest:watch` hook and turns that into a readable message. Never "fix" the test file for this.
- `vite.config.ts` holds the Vitest config (`environment: 'node'`); DOM tests opt into jsdom with a `// @vitest-environment jsdom` docblock. jsdom does not implement `window.scrollTo`, so `src/App.test.tsx` stubs it.
- ESLint disables `react-refresh/only-export-components` for `src/contexts/**` — context modules intentionally export a provider alongside its hook.
- Accessible names matter: the render tests query by role and accessible name, so keep `aria-label`s on icon-only buttons.

## Where to change things

| Need to… | Edit |
| --- | --- |
| Add or change a server query | `src/lib/supabase.ts` (and `src/lib/demoApi.ts` for demo mode) |
| Add a route | `src/lib/router.ts` (parse/build) + `src/App.tsx` (switch) + a page in `src/pages/` |
| Change cart/wishlist behaviour | `src/contexts/CartContext.tsx`, `src/contexts/WishlistContext.tsx` |
| Change pricing or shipping | `src/lib/checkout.ts` **and** `place_order()` in `20251116150200_create_orders.sql` |
| Change the schema | Add a new file under `supabase/migrations/`; never edit an applied one |
| Change seed products | `20251116150400_seed_products.sql`, then `npm run gen:demo` |
| Change shared UI | `src/components/ui.tsx`, `ProductCard.tsx`, `CollectionGrid.tsx` |
