import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { User } from "./types"; // Assuming User type might be needed or for consistency

// Securely get Supabase credentials from Vite's environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log for debugging to see what values are being loaded.
console.log("Supabase URL Loaded:", supabaseUrl ? 'Yes' : 'No');
console.log("Supabase Key Loaded:", supabaseAnonKey ? 'Yes' : 'No');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase credentials are not defined. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
  // You could throw an error here to stop the app from loading further,
  // or display a user-friendly message in the UI.
  throw new Error('Supabase configuration error. Check environment variables.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
