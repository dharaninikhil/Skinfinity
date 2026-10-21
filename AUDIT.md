# Skinfinity — Application Audit

**Date:** 2026-10-21
**Audited commit:** `2ddf244` (`main`, "Initial commit")
**Scope:** full stack — build tooling, routing, data layer, database schema, state management, UI, accessibility, QA and DX.

## Verdict

The project had a solid visual design and a sensible component layout, but it was **not shippable and not runnable as delivered**. Concretely, at the audited commit:

| Check | Before | After |
| --- | --- | --- |
| `npm run typecheck` | ❌ 5 errors | ✅ clean |
| `npm run lint` | ❌ 33 errors, 9 warnings | ✅ clean |
| `npm test` | ⚠️ no test setup | ✅ 82 passing |
| Production build ships images | ❌ 0 of 24 | ✅ all 31 files |
| Navigation targets that render | ❌ 12 dead links → blank page | ✅ all resolve or 404 |
| Cart survives a page reload | ❌ renders "Product", ₹0 | ✅ persisted snapshots |
| Signed-in cart persists to DB | ❌ `cart_items` never written | ✅ synced + merged on login |
| Wishlist works when signed in | ❌ table did not exist | ✅ `wishlists` + RLS |
| Checkout | ❌ dead link, no orders table | ✅ atomic `place_order()` |
| Product detail page | ❌ did not exist | ✅ `/product/:slug` |
| Empty database renders a storefront | ❌ blank catalogue | ✅ seeded + demo mode |

The most serious finding is the class of bug the build hid: **the app looked correct in `vite dev` and was broken in production.** Vite's dev server falls back to serving any file in the project root, so `/assets/hero/glass.jpeg` returned 200 locally — but `assets/` was never in `public/`, so `vite build` produced a `dist/` containing three files and no images at all.

---

## Critical

### C1. Static assets were never deployed
`assets/` sat at the repo root. Vite only copies `public/` into `dist/`. Every hero, category, concern and product image 404'd in any production build, while working in dev.

**Fix:** `git mv assets public/assets`. Added the placeholders the code already referenced but that did not exist (`categories/default.svg`, `concerns/default.svg`) plus `products/placeholder.svg` and a real `favicon.svg`. CI now asserts the built assets exist, so this cannot regress silently.

### C2. The build did not typecheck
`npm run typecheck` failed with 5 errors, including a real defect: `ProfilePage` imported a `Profile` type that `src/lib/supabase.ts` never exported. `vite build` does not typecheck, so nothing surfaced this.

**Fix:** exported `Profile` (and `CartItemRow`, `WishlistRow`, `Order`, `OrderItemRow`, `SkinType`, `ShippingAddress`), removed the unused imports, and made `npm run build` run `tsc --noEmit` first.

### C3. 33 ESLint errors
Concentrated in `WishlistContext` and `WishlistPage`: 20 `no-explicit-any`, 5 `@ts-ignore`, plus unused variables and a no-op expression in `CartPage`.

**Fix:** all resolved. `WishlistContext` now returns normalised `Product[]`, which deleted the type gymnastics entirely rather than papering over it. `react-refresh/only-export-components` is disabled for `src/contexts/**` only, where the provider-plus-hook export is the intended pattern.

### C4. Twelve navigation targets rendered a blank page
`App.tsx` switched on a page token with no default branch. The navbar linked to `search` and `checkout`; the footer linked to `terms`, `privacy`, `help`, `shipping`, `returns` and `contact`; `page === 'new'` just re-rendered `HomePage`. There was no product detail page, no 404, and no order history — `ProfilePage` hard-coded "No orders yet".

**Fix:** added a dependency-free History-API router (`src/lib/router.ts` + `useRoute`/`useNavigate`), which also restores deep links and the back button. Implemented `SearchPage`, `CheckoutPage`, `OrderConfirmationPage`, `OrdersPage`, `ProductPage`, `NewArrivalsPage`, `InfoPage` (all six legal/care pages with real copy) and `NotFoundPage`. Legacy dash tokens are still accepted and translated.

### C5. The cart forgot what was in it
`CartContext` stored quantities in state but product snapshots in a `useRef`. A reload lost the ref, so the cart and drawer rendered `{ name: 'Product', price: 0 }` — a broken image, no name and a ₹0 subtotal on a cart that had real money in it.

**Fix:** snapshots are persisted with quantities under `skinfinity_cart_v3`. Lines migrated from older keys without a snapshot are rehydrated by fetching the products by id.

### C6. Two competing cart storage keys
The provider used `skinfinity_cart_v2`; `CategoryPage` and `ConcernPage` read and wrote `skin_cart`. Quantity badges on those pages never reflected the real cart, and their writes went somewhere nothing read.

**Fix:** one source of truth. Page-level cart state was deleted; both keys are read once for migration.

### C7. The `wishlists` table did not exist
`WishlistContext` queried `wishlists` (`user_id`, `product_id`, `product_json`) but no migration created it. Every wishlist action by a signed-in shopper failed with *"relation public.wishlists does not exist"*; the errors were swallowed into `console.error`, so the UI silently rolled back.

**Fix:** migration `20251116150100_create_wishlists.sql` — table, `UNIQUE(user_id, product_id)`, indexes, RLS. Errors now surface as toasts.

### C8. Documented cart helpers were missing
`.github/copilot-instructions.md` told contributors to use `getOrCreateCartForUser`, `fetchCartItems`, `upsertCartItem` and `mergeLocalCartIntoServer` from `src/lib/supabase.ts`. None existed. `cart_items` and its RLS policies were dead schema, so signed-in users had a purely local cart with no stock validation.

**Fix:** all four implemented to the documented contract, including `err.code === 'OUT_OF_STOCK'` with `err.available`, debounced writes, stock clamping and guest-cart merge on sign-in.

### C9. Checkout had nowhere to go
No `orders` table, no order flow, and pricing would have been computed client-side.

**Fix:** migration `20251116150200_create_orders.sql` adds `orders`, `order_items` and an atomic `place_order()` `SECURITY DEFINER` function: it locks each product row (`FOR UPDATE`), validates stock, prices the order, snapshots line items, decrements stock and clears the cart. Totals cannot be tampered with from the browser. `CheckoutPage` validates an Indian address, and order history is real data on both `OrdersPage` and `ProfilePage`.

### C10. The catalogue was empty
The base migration seeded categories and concerns but **no products**. A freshly provisioned database rendered an empty storefront with no way to exercise the cart, search or checkout.

**Fix:** migration `20251116150400_seed_products.sql` seeds 24 products with realistic INR pricing, sale prices, stock, ratings and ingredients, plus 44 product↔concern mappings so every concern page is populated.

---

## High

### H1. `ConcernPage` double-applied cart changes from a stale closure
It kept its own `cartItems` state, called `ctxAddItem(product, delta)` *and* `ctxSetQuantity(product.id, cartItems[product.id] + delta)` — reading the pre-update render scope. For a signed-in user this sent the wrong quantity; for a guest it wrote to the orphaned `skin_cart` key.

**Fix:** removed. All cart mutation goes through the context.

### H2. Sign-up silently produced an account with no profile
`signUp` only created the `profiles` row when `data.user` was present. With email confirmation enabled Supabase returns no session, so the shopper was redirected home, still signed out, with no profile row.

**Fix:** added a `handle_new_user()` trigger on `auth.users` (idempotent, backfills existing users), passed `full_name`/`skin_type` through `signUp({ options: { data } })`, and made the UI report "check your email" instead of pretending sign-in succeeded.

### H3. No password reset, and errors were shown verbatim
**Fix:** `sendPasswordReset` + a forgot-password flow; Supabase auth messages are mapped to shopper-friendly copy. The "Continue with Google/Apple" buttons called `alert('Social login placeholder')` — real OAuth is now wired and hidden behind `VITE_ENABLE_GOOGLE_OAUTH` so a broken button is never shown by default.

### H4. Slug drift between the database and the asset filenames
Seed data used `lip-care` and `sensitive-skin`; the code and images used `lipcare` and `sensitive`. Concern deep links from the home page could miss, and tiles fell back to placeholders that did not exist (see C1).

**Fix:** migration normalises the slugs; `slugVariants()` resolves every tolerated spelling before falling back to a name match; `src/lib/images.ts` maps both spellings to the same file. Covered by tests.

### H5. Missing config failed silently
`supabase.ts` created a client pointed at `https://placeholder.supabase.co` and logged once. The app then rendered with every query failing for reasons the user could not see.

**Fix:** `isSupabaseConfigured` is exported and drives a dismissible banner. Rather than dead-ending, unconfigured installs now run in **demo mode** — the data layer serves a bundled catalogue generated from the seed migration, and orders persist locally, so the whole storefront is explorable without credentials.

### H6. `CartDrawer` was dead code
Fully implemented but never mounted, and its Checkout button was `{/* TODO: go to checkout */}`.

**Fix:** mounted in the app shell, wired to checkout and the cart page, with free-shipping progress, stock-aware quantity inputs, Escape/backdrop close and scroll lock.

### H7. Duplicated product-card markup had already drifted
`CategoryPage` and `ConcernPage` each carried ~120 lines of card markup copied from `ProductCard`, which is how the wishlist button, stock handling and price formatting diverged between pages.

**Fix:** one `ProductCard` + `ProductGrid`, and a `CollectionGrid` shell that owns sort, loading, error, empty and breadcrumb state. `CategoryPage` fell from 234 lines to 36 and `ConcernPage` from 379 to 32.

---

## Medium

| # | Finding | Fix |
| --- | --- | --- |
| M1 | No confirmation on destructive actions (`clearCart`, and a comment reading "NO confirmation, immediate action" on the wishlist) | Two-step confirm on both |
| M2 | `WishlistPage.clearWishlist` deleted rows directly, then called `toggleWishlist` per item — an O(n) second delete pass against already-deleted rows | Context-level `clearWishlist`, one request |
| M3 | Debug `console.log` in `main.tsx` and `WishlistPage` | Removed; `main.tsx` now throws a clear error if `#root` is missing |
| M4 | Newsletter form only `console.log`ed the address | `newsletter_subscribers` table (insert-only for `anon`, no read policy) with duplicate-tolerant upsert |
| M5 | Footer existed only on `HomePage` | Extracted to `Footer`, rendered on every page |
| M6 | Mobile hid cart and wishlist, leaving only a floating "Checkout" FAB that went nowhere | Mobile sheet with search, cart, wishlist, account, categories and concerns |
| M7 | Icon-only buttons had no accessible names; wishlist heart had `isWished ? 'bg-white' : 'bg-white'` | `aria-label`s throughout (the render tests query by accessible name, so this is enforced); dead ternaries removed |
| M8 | No `.env.example`; README was two lines; package named `vite-react-typescript-starter` | `.env.example` with guidance, full README, renamed package |
| M9 | No CI | `.github/workflows/ci.yml` runs typecheck, lint, test, build, asserts built assets exist and that generated demo data is in sync. Installs Node from `.nvmrc` (`node-version-file`) so CI and local cannot drift |
| M13 | No declared runtime: the jsdom tests need Node >= 22.22.2 (`undici` reads `zlib.createZstdDecompress` at import), but nothing said so | `engines` in `package.json`, `.nvmrc`, and `scripts/check-node.mjs` wired in as a `pretest`/`pretest:watch` hook — an unsupported Node now fails with a readable message instead of a `TypeError: Cannot read properties of undefined (reading 'bind')` from inside `node_modules/undici` |
| M10 | No tests | 82 tests (see below) |
| M11 | `index.html` had a generic title and `og:image` pointing at `bolt.new` | Real title, description, OG/Twitter tags, theme colour, SVG favicon |
| M12 | Hero had no call to action (comment: "Buttons removed as requested") | Two CTAs plus a trust bar, bestsellers rail and a skin-profile prompt |

---

## Verification

```
npm run typecheck   ✅  0 errors
npm run lint        ✅  0 errors, 0 warnings
npm test            ✅  82 passed (6 files)
npm run build       ✅  dist/ = 31 files including all 24 original assets
```

- **Unit** — currency/slug/date formatting, `slugVariants` aliasing, route parsing and legacy-token translation, shipping thresholds, discount-against-shipping interaction, Indian address/phone/PIN validation, stock and discount helpers.
- **Drift guard** — the generated demo catalogue is validated against the SQL seed: referential integrity, unique slugs, every shoppable category and every concern populated, and the two sources kept in sync.
- **Render (jsdom)** — requires Node >= 22.22.2 (see M13). The app is mounted at real URLs to prove home, category, concern (including alias slugs), product detail, search-from-query, 404 and all six info pages render; and that add-to-cart, navbar badges, the cart drawer, checkout, stock clamping and the wishlist flow all behave.

These tests earned their keep immediately: they caught `HomePage` bailing out of its data load in demo mode and a product-detail save button with no accessible name — both fixed.

Two SQL notes: the migrations parse cleanly as Postgres, and every statement is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `DROP POLICY IF EXISTS`) so they can be re-applied. The one apparent parse failure in tooling is `DROP TRIGGER … ON auth.users`, which sqlglot cannot parse but Postgres accepts.

---

## Remaining gaps (deliberately not done)

These need decisions or credentials, so they were left out rather than stubbed:

1. **Payments.** Only cash on delivery is live. `PAYMENT_METHODS` in `CheckoutPage.tsx` carries a disabled "Card / UPI" entry. Adding Razorpay/Stripe means a provider secret, a webhook handler and a server-side status transition — not a client change.
2. **Product photography.** `image_url` is empty for all seeded products, so they render the branded placeholder. Upload to Supabase Storage and populate the column.
3. **Transactional email.** Order confirmations and password resets rely on Supabase's default templates. A real sender needs SMTP configuration.
4. **Reviews.** `rating`/`review_count` are seeded and displayed but there is no submission flow or `reviews` table.
5. **Admin.** Catalogue changes require SQL. No product CRUD UI exists.
6. **Real-time stock.** Stock is validated at checkout and on cart writes, but two shoppers can both see "1 left" until one of them checks out.
7. **Analytics / SEO.** No sitemap, robots.txt, structured data (Product schema) or analytics.
8. **Content review.** The legal and care copy in `InfoPage.tsx` is a realistic starting point, not legal advice — have it reviewed before trading.
9. **End-to-end tests against a live database.** The render tests cover the UI in demo mode; the Supabase path (auth, RLS, `place_order`) is only covered by migration review.

## Suggested next steps

1. Apply the five new migrations to the Supabase project and confirm `npm run dev` with real credentials.
2. Upload product images and set `image_url`.
3. Pick a payment provider and wire the webhook; then remove the demo-mode guest checkout path if it should not exist in production.
4. Add `Product` JSON-LD and a sitemap — the routes are now stable URLs, so this is cheap.
5. Replace the placeholder legal copy.
