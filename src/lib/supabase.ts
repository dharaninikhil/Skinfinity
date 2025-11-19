// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (!url || !anonKey) {
  console.error('Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  // Create a dummy client to prevent app crash
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
} else {
  supabase = createClient(url, anonKey);
}

export { supabase };

export type Product = {
  id: string;
  name: string;
  slug?: string;
  price?: number | null;
  is_new?: boolean;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  category_id?: string | null;
  description?: string | null;
  ingredients?: string | null;
  stock_quantity?: number | null;
  short_description?: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  display_order?: number | null;
};

export type SkinConcern = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
};
