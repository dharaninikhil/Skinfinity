/*
  # Wishlists

  `WishlistContext` has always read and written a `wishlists` table, but no
  migration ever created it — every wishlist action by a signed-in shopper
  failed with "relation public.wishlists does not exist".

  ## Table
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key -> auth.users, cascade)
  - `product_id` (uuid, foreign key -> products, cascade)
  - `product_json` (jsonb) - denormalised product snapshot so the wishlist
    renders even if the catalogue row changes or is removed
  - `created_at` (timestamptz)
  - unique (`user_id`, `product_id`) so re-saving is idempotent

  ## Security
  - RLS enabled; shoppers can only read and write their own rows.
*/

CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_json jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON wishlists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wishlists_product_id_idx ON wishlists (product_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlists;
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own wishlist" ON wishlists;
CREATE POLICY "Users can add to own wishlist"
  ON wishlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wishlist" ON wishlists;
CREATE POLICY "Users can update own wishlist"
  ON wishlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own wishlist" ON wishlists;
CREATE POLICY "Users can remove from own wishlist"
  ON wishlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
