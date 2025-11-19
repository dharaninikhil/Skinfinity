<!-- Repository-specific guidance for AI coding agents. Keep concise and actionable. -->
# Copilot / AI Agent Instructions

Purpose: Help AI contributors understand this codebase quickly — architecture, key patterns, developer workflows, and integration points.

**Quick Start**:
- **Dev server:** `npm run dev` (uses `vite`).
- **Build / preview:** `npm run build` and `npm run preview`.
- **Typecheck:** `npm run typecheck` (uses `tsconfig.app.json`).
- **Lint:** `npm run lint` (ESLint configured).

**Big Picture Architecture**:
- Lightweight single-page React + TypeScript app using Vite + Tailwind. Entry is `src/main.tsx` -> `src/App.tsx`.
- No React Router — navigation is app-level state. `App` uses `useState('page')` and `onNavigate` string tokens (examples: `category-{slug}`, `concern-{slug}`, `home`, `cart`, `profile`, `login`). Search for `onNavigate` to find navigation call sites.
- Global providers wrap the app: `AuthProvider` then `CartProvider` (see `src/App.tsx`). Auth state is required before rendering UI.

**Backend / Data Layer**:
- Supabase client is created in `src/lib/supabase.ts`. Environment variables used: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (via `import.meta.env`).
- All server operations use the `supabase` client exported from `src/lib/supabase.ts`. Look here for helper functions: `getOrCreateCartForUser`, `fetchCartItems`, `upsertCartItem`, `mergeLocalCartIntoServer`.
- Database migration(s) live under `supabase/migrations/` (single SQL file present). Column naming follows snake_case (example: `profiles.skin_type`, `products.stock_quantity`).

**Key Patterns & Conventions (project-specific)**:
- Navigation: use `onNavigate` with hyphen-separated tokens. E.g. `onNavigate('category-cleansers')` will set `page='category'` and `pageParam='cleansers'` in `AppInner`.
- Auth: `useAuth()` throws if used outside `AuthProvider`. Sign-up flow writes both Supabase auth user and a row into `profiles` (see `AuthContext.tsx`).
- Cart: Local-first when unauthenticated. Local cart persisted under `localStorage` key `skin_cart`. When user logs in, local cart is merged into server via `mergeLocalCartIntoServer`.
- Stock validation: `upsertCartItem` enforces server-side stock checks and throws an error with `err.code === 'OUT_OF_STOCK'` and `err.available` when requested quantity exceeds stock. Client code handles these cases in `CartContext`.
- Images: product images may be stored on DB `product.image_url` or derived from assets (`/assets/new/{product.id}.jpg`). Category/concern images are under `assets/categories/` and `assets/concerns/` — components include fallbacks on `onError`.
- Styling: Tailwind utility classes used across components (see `tailwind.config.js` and `index.css`).
- Icons: `lucide-react` is used; note it is excluded from `optimizeDeps` in `vite.config.ts`.

**Where to change/add features**:
- Data helpers / server behavior: edit or add functions in `src/lib/supabase.ts`. Follow existing patterns: return typed results, throw Supabase errors, use `maybeSingle()` when appropriate.
- Context-level state and side-effects: `src/contexts/AuthContext.tsx` and `src/contexts/CartContext.tsx` — keep optimistic UI updates and always refresh from server on failure (current pattern).
- UI pages: `src/pages/*` (HomePage, CategoryPage, ConcernPage, CartPage, ProfilePage, LoginPage). Use `onNavigate` to switch pages.

**Dev notes / gotchas**:
- There is no client-side router; adding one requires migrating `AppInner` navigation logic and component entry points.
- Environment secrets must be provided via Vite env (prefix `VITE_`). Local development will fail without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- DB column names are snake_case; when inserting or selecting in Supabase keep naming consistent (e.g., `skin_type`).
- `CartContext` performs optimistic updates and persists to `localStorage` for unauthenticated users — tests or changes should account for this behavior.

**Examples** (copy/paste patterns)
- Check stock before upsert (server helper): see `src/lib/supabase.ts::upsertCartItem` — throws `OUT_OF_STOCK` with `.available`.
- Merge local cart on login: `CartContext` calls `mergeLocalCartIntoServer(user.id, localMap)` then clears `localStorage`.
- Navigation token parsing: `const [base, ...rest] = to.split('-')` in `AppInner.onNavigate` (so `category-ampoule-serum` becomes base `category` and param `ampoule-serum`).

If anything in these notes is incomplete or you want examples for a specific task (adding a new API helper, changing cart behavior, or migrating to React Router), tell me which area and I'll expand this file accordingly.
