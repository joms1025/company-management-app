
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { User } from "./types"; // Assuming User type might be needed or for consistency

// Try to get Supabase creds from process.env, then from window object
const supabaseUrlEnv = process.env.SUPABASE_URL;
const supabaseUrlWindow = (window as any).SUPABASE_URL;
const supabaseUrl = supabaseUrlEnv || supabaseUrlWindow;

const supabaseAnonKeyEnv = process.env.SUPABASE_ANON_KEY;
const supabaseAnonKeyWindow = (window as any).SUPABASE_ANON_KEY;
const supabaseAnonKey = supabaseAnonKeyEnv || supabaseAnonKeyWindow;


let supabase: SupabaseClient | null = null;

const PLACEHOLDER_URL = "YOUR_SUPABASE_URL_HERE";
const PLACEHOLDER_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

if (!supabaseUrl || supabaseUrl === PLACEHOLDER_URL) {
  console.error(
    `Supabase URL is not defined or is still a placeholder ('${PLACEHOLDER_URL}'). ` +
    "Please set a valid SUPABASE_URL in your environment (process.env) or, if developing in a static HTML setup, " +
    "ensure window.SUPABASE_URL is correctly set with your actual Supabase project URL in index.html."
  );
} else if (!supabaseAnonKey || supabaseAnonKey === PLACEHOLDER_KEY) {
  console.error(
    `Supabase Anon Key is not defined or is still a placeholder ('${PLACEHOLDER_KEY}'). ` +
    "Please set a valid SUPABASE_ANON_KEY in your environment (process.env) or, if developing in a static HTML setup, " +
    "ensure window.SUPABASE_ANON_KEY is correctly set with your actual Supabase project anon key in index.html."
  );
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized.");
  } catch (error: any) { // Catching 'any' type for error as it could be various things
    console.error("Error initializing Supabase client:", error.message || error);
    supabase = null; // Ensure supabase is null if initialization fails
  }
}

export default supabase;

// Type guard to check if the user object from Supabase has the expected metadata structure.
// You might need to adjust this based on how you actually store custom user data.
export const hasUserAppData = (
  user: any
): user is User & { app_metadata: { role: string; department: string; name: string } } => {
  return (
    user &&
    user.app_metadata &&
    typeof user.app_metadata.role === "string" &&
    typeof user.app_metadata.department === "string" &&
    (typeof user.app_metadata.name === "string" || typeof user.user_metadata?.name === 'string') // Supabase often uses user_metadata for custom fields
  );
};
