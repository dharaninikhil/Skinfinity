/*
  # Extend the catalogue schema

  Adds the columns the storefront reads (sale pricing, ratings, a contact number
  on profiles), normalises slugs so they match the bundled asset filenames, and
  indexes the lookup paths used on every page.

  ## Changes
  - `products`: `compare_at_price`, `rating`, `review_count`
  - `profiles`: `phone`
  - Slug fixes: `lip-care` -> `lipcare`, `sensitive-skin` -> `sensitive`
  - `set_updated_at()` trigger applied to mutable tables
  - Indexes on `products(category_id|slug|is_new)`, `product_concerns(concern_id)`,
    `cart_items(user_id)`, `profiles(skin_type)`
*/

-- --------------------------------------------------------------- columns

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS rating numeric(2, 1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '';

-- A rating is a 0–5 average; keep bad data out at the source.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_rating_range;
ALTER TABLE products
  ADD CONSTRAINT products_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_not_negative;
ALTER TABLE products
  ADD CONSTRAINT products_stock_not_negative CHECK (stock_quantity IS NULL OR stock_quantity >= 0);

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_quantity_positive;
ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);

-- ---------------------------------------------------------- slug hygiene
-- The seeded slugs and the image files under public/assets disagreed
-- (`lip-care` vs `lipcare.jpeg`, `sensitive-skin` vs `sensitive.jpeg`), so
-- category and concern tiles silently fell back to placeholders.
UPDATE categories SET slug = 'lipcare' WHERE slug = 'lip-care';
UPDATE skin_concerns SET slug = 'sensitive' WHERE slug = 'sensitive-skin';

-- --------------------------------------------------------- updated_at

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS cart_items_set_updated_at ON cart_items;
CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------- indexes

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS products_slug_idx ON products (slug);
CREATE INDEX IF NOT EXISTS products_is_new_idx ON products (is_new) WHERE is_new;
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS product_concerns_concern_id_idx ON product_concerns (concern_id);
CREATE INDEX IF NOT EXISTS product_concerns_product_id_idx ON product_concerns (product_id);
CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON cart_items (user_id);
CREATE INDEX IF NOT EXISTS profiles_skin_type_idx ON profiles (skin_type);
