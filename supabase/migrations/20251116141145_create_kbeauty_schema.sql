/*
  # K-Beauty E-Commerce Database Schema

  ## Overview
  Creates tables for a Korean beauty product e-commerce platform with support for products, categories, skin concerns, and user profiles.

  ## New Tables
  
  ### `categories`
  Main product categories (Cleanser, Toner, Ampoule & Serum, etc.)
  - `id` (uuid, primary key)
  - `name` (text, unique) - Category name
  - `slug` (text, unique) - URL-friendly version
  - `description` (text) - Category description
  - `display_order` (integer) - Sort order
  - `created_at` (timestamptz)

  ### `skin_concerns`
  Skin concern categories (Acne & Breakout, Pores, Dullness & Tone, etc.)
  - `id` (uuid, primary key)
  - `name` (text, unique) - Concern name
  - `slug` (text, unique) - URL-friendly version
  - `description` (text) - Concern description
  - `display_order` (integer) - Sort order
  - `created_at` (timestamptz)

  ### `products`
  Product catalog
  - `id` (uuid, primary key)
  - `name` (text) - Product name
  - `slug` (text, unique) - URL-friendly version
  - `description` (text) - Full product description
  - `short_description` (text) - Brief description
  - `price` (decimal) - Product price
  - `category_id` (uuid, foreign key) - Main category
  - `image_url` (text) - Product image
  - `ingredients` (text) - Key ingredients
  - `how_to_use` (text) - Usage instructions
  - `is_new` (boolean) - New arrival flag
  - `stock_quantity` (integer) - Available stock
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `product_concerns`
  Many-to-many relationship between products and skin concerns
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `concern_id` (uuid, foreign key)
  - `created_at` (timestamptz)

  ### `profiles`
  Extended user profile information
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `skin_type` (text) - User's skin type
  - `avatar_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `cart_items`
  Shopping cart items
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References auth.users
  - `product_id` (uuid, foreign key)
  - `quantity` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public read access for products, categories, and concerns
  - Authenticated users can manage their own profiles and cart items
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create skin_concerns table
CREATE TABLE IF NOT EXISTS skin_concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  short_description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  category_id uuid REFERENCES categories(id),
  image_url text DEFAULT '',
  ingredients text DEFAULT '',
  how_to_use text DEFAULT '',
  is_new boolean DEFAULT false,
  stock_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_concerns junction table
CREATE TABLE IF NOT EXISTS product_concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  concern_id uuid REFERENCES skin_concerns(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, concern_id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  skin_type text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Skin concerns policies (public read)
CREATE POLICY "Skin concerns are viewable by everyone"
  ON skin_concerns FOR SELECT
  TO anon, authenticated
  USING (true);

-- Products policies (public read)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Product concerns policies (public read)
CREATE POLICY "Product concerns are viewable by everyone"
  ON product_concerns FOR SELECT
  TO anon, authenticated
  USING (true);

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Cart items policies
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample categories
INSERT INTO categories (name, slug, description, display_order) VALUES
  ('New', 'new', 'Latest arrivals in K-beauty', 1),
  ('Cleanser', 'cleanser', 'Double cleanse your way to clear skin', 2),
  ('Toner', 'toner', 'Balance and hydrate your skin', 3),
  ('Ampoule & Serum', 'ampoule-serum', 'Concentrated treatments for targeted concerns', 4),
  ('Moisturizer', 'moisturizer', 'Lock in hydration and protect your skin', 5),
  ('Mask & Treatment', 'mask-treatment', 'Weekly treats for glowing skin', 6),
  ('Sunscreen', 'sunscreen', 'Essential daily protection', 7),
  ('Lip Care', 'lip-care', 'Nourish and protect your lips', 8),
  ('Sets', 'sets', 'Curated skincare routines', 9),
  ('Merchandise', 'merchandise', 'Tools and accessories', 10)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample skin concerns
INSERT INTO skin_concerns (name, slug, description, display_order) VALUES
  ('Acne & Breakout', 'acne-breakout', 'Combat blemishes and prevent future breakouts', 1),
  ('Pores', 'pores', 'Minimize and refine enlarged pores', 2),
  ('Dullness & Tone', 'dullness-tone', 'Brighten and even out skin tone', 3),
  ('Wrinkles', 'wrinkles', 'Reduce fine lines and improve elasticity', 4),
  ('Sensitive Skin', 'sensitive-skin', 'Gentle care for reactive skin', 5),
  ('Dry & Dehydrated Skin', 'dry-dehydrated', 'Intense hydration and moisture barrier repair', 6)
ON CONFLICT (slug) DO NOTHING;