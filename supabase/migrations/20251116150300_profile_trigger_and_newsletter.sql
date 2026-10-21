/*
  # Profile bootstrap trigger and newsletter sign-ups

  ## Why
  - `AuthContext.signUp` inserted the `profiles` row from the browser. When email
    confirmation is enabled Supabase returns no session, so that insert never ran
    and the shopper ended up with an account but no profile. This trigger creates
    the row inside Postgres the moment the auth user exists.
  - The footer newsletter form only `console.log`ed the address. This gives it a
    real, insert-only table.

  ## Objects
  - `handle_new_user()` + `on_auth_user_created` trigger on `auth.users`
  - `newsletter_subscribers` (insert-only for anon and authenticated roles)
*/

-- ------------------------------------------------------- profile trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, skin_type)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data ->> 'skin_type', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = coalesce(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
        skin_type = coalesce(NULLIF(public.profiles.skin_type, ''), EXCLUDED.skin_type),
        updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for accounts that already exist without one.
INSERT INTO public.profiles (id, full_name, skin_type)
SELECT u.id, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1), ''), ''
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------- newsletter subscribers

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (lower(email));

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone may subscribe; nobody may read the list back through the anon key.
DROP POLICY IF EXISTS "Anyone can subscribe to the newsletter" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to the newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
