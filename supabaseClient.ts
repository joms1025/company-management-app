import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Securely get Supabase credentials from Vite's environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This error will be caught by the browser console and stops the app if keys are missing.
  throw new Error("Supabase URL or Anon Key is missing. Check your Vercel environment variables.");
}

// Initialize the client with the secure variables.
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
