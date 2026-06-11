// app/lib/supabase.ts
// ====================
// The Supabase client — talks to our Supabase project for authentication.
//
// What it does:
// - Creates a single shared client instance for the whole app
// - Reads URL and "anon" key from environment variables
// - Used by Login / Signup / AuthProvider to manage user sessions
//
// Why "anon key" not "service role key"?
// - The anon key is SAFE for the browser (limited permissions)
// - The service role key would be DANGEROUS in the browser (full database access)
// - Backend uses service role key; frontend uses anon key. Different jobs!

import { createClient } from "@supabase/supabase-js";

// Read from environment variables (set in Netlify and .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Warn during development if config is missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Authentication features will not work until these are set.",
  );
}

// Create and export a single client for the whole app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the user signed in even after closing the tab
    persistSession: true,
    // Automatically refresh the session before it expires
    autoRefreshToken: true,
    // Detect login state from URL (for email confirmation links, etc.)
    detectSessionInUrl: true,
  },
});

// Helper: is Supabase actually configured?
export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
