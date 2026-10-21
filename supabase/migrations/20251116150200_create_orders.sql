/*
  # Orders and atomic checkout

  Checkout was a dead link in the UI and there was nowhere to persist an order —
  `ProfilePage` hard-coded "No orders yet". This adds the order tables and a
  `place_order` Postgres function so pricing and stock are decided server-side.

  ## Tables
  ### `orders`
  One row per checkout: totals, shipping address snapshot, payment method, status.
  ### `order_items`
  Line items with the product name/slug/image/price frozen at purchase time, so
  historical orders stay accurate when the catalogue changes.

  ## Function
  ### `place_order(p_address jsonb, p_items jsonb, p_payment_method text, p_notes text)`
  SECURITY DEFINER. Locks each product row, validates stock, prices the order with
  the same rules as `src/lib/checkout.ts`, writes the order + line items,
  decrements stock and clears the shopper's cart. Returns the created `orders` row.

  ## Security
  - RLS enabled; shoppers can only read their own orders.
  - No client INSERT/UPDATE/DELETE policies: orders are created exclusively by
    `place_order`, which runs as the table owner.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  shipping_fee numeric(10, 2) NOT NULL DEFAULT 0,
  discount numeric(10, 2) NOT NULL DEFAULT 0,
  total numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  address_line1 text NOT NULL,
  address_line2 text DEFAULT '',
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  payment_method text NOT NULL DEFAULT 'cod',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (subtotal >= 0 AND shipping_fee >= 0 AND discount >= 0 AND total >= 0)
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_slug text DEFAULT '',
  image_url text DEFAULT '',
  unit_price numeric(10, 2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Line items are readable only through an order the shopper owns.
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------ place_order

CREATE OR REPLACE FUNCTION public.place_order(
  p_address jsonb,
  p_items jsonb,
  p_payment_method text DEFAULT 'cod',
  p_notes text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders;
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_product public.products;
  v_product_id uuid;
  v_qty integer;
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  -- Must match src/lib/checkout.ts
  v_free_shipping_threshold numeric(10, 2) := 1499;
  v_flat_shipping_fee numeric(10, 2) := 99;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order.' USING ERRCODE = '28000';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.' USING ERRCODE = '22023';
  END IF;

  IF p_address IS NULL OR coalesce(p_address ->> 'full_name', '') = ''
     OR coalesce(p_address ->> 'address_line1', '') = ''
     OR coalesce(p_address ->> 'city', '') = ''
     OR coalesce(p_address ->> 'postal_code', '') = '' THEN
    RAISE EXCEPTION 'A complete shipping address is required.' USING ERRCODE = '22023';
  END IF;

  -- Price and validate every line, locking products so concurrent checkouts
  -- cannot both claim the same last unit.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_line ->> 'product_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'A cart line references an invalid product.' USING ERRCODE = '22023';
    END;

    v_qty := greatest(1, coalesce((v_line ->> 'quantity')::integer, 1));

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product in your cart is no longer available.' USING ERRCODE = '22023';
    END IF;

    IF coalesce(v_product.stock_quantity, 0) < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %: only % left.',
        v_product.name, coalesce(v_product.stock_quantity, 0)
        USING ERRCODE = '22023';
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_qty);

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_slug', coalesce(v_product.slug, ''),
      'image_url', coalesce(v_product.image_url, ''),
      'unit_price', v_product.price,
      'quantity', v_qty
    );
  END LOOP;

  IF v_subtotal >= v_free_shipping_threshold THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_flat_shipping_fee;
  END IF;

  v_total := v_subtotal + v_shipping;

  v_order_number := 'SKF-' || to_char(now(), 'YYMMDD') || '-' ||
                    upper(substr(replace(v_order_id::text, '-', ''), 1, 6));

  INSERT INTO orders (
    id, user_id, order_number, status,
    subtotal, shipping_fee, discount, total, currency,
    full_name, email, phone,
    address_line1, address_line2, city, state, postal_code, country,
    payment_method, notes
  ) VALUES (
    v_order_id, v_user, v_order_number,
    CASE WHEN coalesce(p_payment_method, 'cod') = 'cod' THEN 'pending' ELSE 'paid' END,
    v_subtotal, v_shipping, 0, v_total, 'INR',
    p_address ->> 'full_name',
    coalesce(p_address ->> 'email', ''),
    coalesce(p_address ->> 'phone', ''),
    p_address ->> 'address_line1',
    coalesce(p_address ->> 'address_line2', ''),
    p_address ->> 'city',
    coalesce(p_address ->> 'state', ''),
    p_address ->> 'postal_code',
    coalesce(p_address ->> 'country', 'India'),
    coalesce(p_payment_method, 'cod'),
    coalesce(p_notes, '')
  );

  INSERT INTO order_items (order_id, product_id, product_name, product_slug, image_url, unit_price, quantity)
  SELECT
    v_order_id,
    (l ->> 'product_id')::uuid,
    l ->> 'product_name',
    l ->> 'product_slug',
    l ->> 'image_url',
    (l ->> 'unit_price')::numeric(10, 2),
    (l ->> 'quantity')::integer
  FROM jsonb_array_elements(v_lines) AS l;

  -- Decrement stock for everything that was just purchased.
  UPDATE products p
  SET stock_quantity = p.stock_quantity - l.qty
  FROM (
    SELECT (l ->> 'product_id')::uuid AS pid, (l ->> 'quantity')::integer AS qty
    FROM jsonb_array_elements(v_lines) AS l
  ) AS l
  WHERE p.id = l.pid;

  DELETE FROM cart_items WHERE user_id = v_user;

  SELECT * INTO v_order FROM orders WHERE id = v_order_id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text, text) TO authenticated;

COMMENT ON FUNCTION public.place_order(jsonb, jsonb, text, text) IS
  'Validates stock, prices the order, writes orders/order_items, decrements stock and clears the cart. Returns the created order.';
