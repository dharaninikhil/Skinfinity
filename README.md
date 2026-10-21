# Skinfinity

A K-beauty e-commerce storefront built with **React 18 + TypeScript + Vite + Tailwind CSS**, backed by **Supabase** (Postgres, Auth, Row Level Security).

Browse by category or skin concern, search the catalogue, read product detail pages, save a wishlist, manage a cart that syncs across devices, and check out.

---

## Quick start

```bash
npm install
cp .env.example .env     # then paste in your Supabase URL + anon key
npm run dev              # http://localhost:5173
```

**No Supabase project yet?** The app detects the missing environment variables and starts in **demo mode**: it serves the bundled sample catalogue (`src/lib/demoData.ts`, generated from the seed migration) and stores carts, wishlists and orders in `localStorage`. Every screen is explorable without a backend — a banner at the top tells you demo mode is active.

### Connect a real database

1. Create a Supabase project.
2. Apply the migrations in order (SQL editor, or `supabase db push` with the CLI):

   | Migration | Purpose |
   | --- | --- |
   | `20251116141145_create_kbeauty_schema.sql` | Categories, concerns, products, profiles, cart_items + RLS |
   | `20251116150000_extend_catalogue_columns.sql` | Sale pricing, ratings, slug fixes, indexes |
   | `20251116150100_create_wishlists.sql` | `wishlists` table + RLS |
   | `20251116150200_create_orders.sql` | `orders`, `order_items`, atomic `place_order()` |
   | `20251116150300_profile_trigger_and_newsletter.sql` | Profile bootstrap trigger, newsletter table |
   | `20251116150400_seed_products.sql` | 24 sample products mapped to concerns |

3. Copy the URL and **anon** key from *Project Settings → API* into `.env`.

> The anon key is public by design. Row Level Security is what protects the data — never the key.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key |
| `VITE_ENABLE_GOOGLE_OAUTH` | no | `true` shows "Continue with Google" (also enable the provider in Supabase → Auth) |

---

## Scripts

```bash
npm run dev         # Vite dev server (binds 0.0.0.0)
npm run build       # Typecheck, then production build to dist/
npm run preview     # Serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm test            # Vitest, single run
npm run test:watch  # Vitest in watch mode
npm run gen:demo    # Regenerate src/lib/demoData.ts from the seed migration
npm run check       # typecheck + lint + test + build (what CI runs)
```

---

## Architecture

```
src/
  App.tsx                 Route switch + auth guards + app shell
  main.tsx                Provider tree: Toast > Auth > Wishlist > Cart > App
  components/
    Navbar.tsx            Sticky nav, search, cart/wishlist/account, mobile sheet
    Footer.tsx            Site-wide footer, newsletter, info links
    CartDrawer.tsx        Slide-over cart with free-shipping progress
    ProductCard.tsx       The one product tile used by every grid
    CollectionGrid.tsx    Shared listing shell: sort, loading, empty, error
    OrderStatusBadge.tsx
    ui.tsx                Spinner, PageLoader, EmptyState, Button, DiscountBadge
  contexts/
    AuthContext.tsx       Session, profile, sign-up/in/out, password reset
    CartContext.tsx       Local-first cart + server sync + stock clamping
    WishlistContext.tsx   Local-first wishlist + server sync
    ToastContext.tsx      Notifications
  hooks/
    useRoute.ts           Reactive route + navigate()
    useCatalog.ts         Categories/concerns, loaded once per session
  lib/
    supabase.ts           Client, row types, every server query
    router.ts             URL parsing / building (no router dependency)
    checkout.ts           Pricing rules + address validation
    products.ts           Stock helpers, product path
    format.ts             Currency, slugs, dates
    images.ts             Image resolution + placeholders
    demoData.ts           GENERATED offline catalogue
    demoApi.ts            Offline implementation of the queries
  pages/                  Home, New, Category, Concern, Product, Search, Cart,
                          Checkout, OrderConfirmation, Orders, Wishlist, Login,
                          Profile, Info, NotFound
public/assets/            Hero, category, concern and placeholder images
supabase/migrations/      Schema, RLS, triggers, place_order(), seed data
scripts/                  Demo-data generator
```

### Routing

There is **no router dependency**. `src/lib/router.ts` parses and builds URLs on top of the History API, and `useRoute()` / `useNavigate()` expose it to components.

| Route | Page |
| --- | --- |
| `/` | Home |
| `/new` | New arrivals |
| `/category/:slug` | Category listing |
| `/concern/:slug` | Skin-concern listing |
| `/product/:slug` | Product detail |
| `/search?q=:term` | Search results |
| `/cart`, `/checkout` | Cart and checkout |
| `/order/:id`, `/orders` | Order confirmation and history |
| `/wishlist` | Saved products |
| `/profile`, `/login` | Account |
| `/info/:slug` | Terms, privacy, help, shipping, returns, contact |
| anything else | 404 |

Legacy dash tokens (`category-cleanser`, `search-vitamin%20c`) are still accepted by `navigate()` and translated to real paths.

`/profile` always requires a session. `/checkout`, `/orders` and `/order/:id` require one only when Supabase is configured — in demo mode guests can complete a purchase.

### Data layer

All Supabase access goes through `src/lib/supabase.ts`. UI components never build queries inline. Helpers throw a normalised `AppError` with a `code` (`OUT_OF_STOCK`, `NOT_FOUND`, `UNAUTHENTICATED`, `NOT_CONFIGURED`) so callers can react without string matching.

Every read helper starts with `if (!isSupabaseConfigured) return demo…()`, which is what makes demo mode work without a second code path in the UI.

### Cart

Local-first, with the server as the source of truth once signed in:

- Persisted under `skinfinity_cart_v3` **including product snapshots**, so names, prices and images survive a reload. Earlier keys (`skinfinity_cart_v2`, `skin_cart`) are migrated on first load, and lines without a snapshot are rehydrated by fetching the products.
- On sign-in, the guest cart is merged into `cart_items` via `mergeLocalCartIntoServer`, clamped to available stock, and the server list then replaces local state.
- Writes are debounced per product (`upsertCartItem`), stock is re-validated server-side, and an `OUT_OF_STOCK` error rolls the line back to `available` and raises a toast.

### Checkout

`place_order()` is a `SECURITY DEFINER` Postgres function. It locks each product row, validates stock, prices the order with the same thresholds as `src/lib/checkout.ts`, writes `orders` + `order_items` (snapshotting name, slug, image and unit price), decrements stock, and clears the cart — atomically. Clients cannot tamper with totals.

Only cash on delivery is wired up. To accept prepaid payments, add a provider and extend `PAYMENT_METHODS` in `CheckoutPage.tsx`.

---

## Testing

`npm test` runs 82 Vitest tests:

- **Unit** — currency/slug/date formatting, slug-alias resolution, route parsing and token translation, order pricing and shipping thresholds, Indian address validation, stock and discount helpers.
- **Data drift guard** — the generated demo catalogue is checked against the SQL seed migration: referential integrity, unique slugs, every category and concern populated, and the two sources kept in sync.
- **Render smoke tests** (jsdom) — the app is rendered at real URLs to prove the home page, category, concern (including alias slugs), product detail, search, 404 and all six info pages render, and that add-to-cart, the cart drawer, checkout, stock clamping and the wishlist all work.

---

## Conventions

- **Snake_case columns** in SQL (`skin_type`, `stock_quantity`); camelCase in TypeScript.
- **Prices** come back from Postgres `decimal` columns as strings — always pass them through `toNumber()` before arithmetic and `formatINR()` before display.
- **Images** are resolved through `src/lib/images.ts`, which maps slugs to files (tolerating `lip-care` vs `lipcare`) and falls back to branded placeholders instead of broken-image icons.
- **Static assets live in `public/`.** Vite only copies `public/` into `dist/`; files elsewhere are served in dev but 404 in production.
- **Context files** export their provider and hook together; ESLint disables the fast-refresh rule for `src/contexts/**` on purpose.
- `src/lib/demoData.ts` is **generated** — edit the seed migration and run `npm run gen:demo`.

---

## Continuous integration

`.github/workflows/ci.yml` runs `npm run check` (typecheck, lint, test, build) on every push and pull request, and verifies the production build actually contains the static assets.
