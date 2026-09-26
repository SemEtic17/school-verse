import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Copy .env.example to .env.local and set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

/**
 * Browser Supabase client.
 *
 * `detectSessionInUrl` + PKCE let the client complete the Google OAuth
 * redirect back into the app without a server round-trip, which is what the
 * static SPA deploy relies on.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
