import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Null when the app is built without Supabase settings. The app then runs
 * on-device only, with no accounts, as before.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      })
    : null;

export const cloudEnabled = supabase !== null;

/** Where email links (confirmation and password reset) send the user back to. */
export function appUrl(): string {
  return window.location.origin + window.location.pathname;
}
