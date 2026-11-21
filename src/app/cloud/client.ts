import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Preferences } from "@capacitor/preferences";
import { isNative, NATIVE_AUTH_REDIRECT } from "../native/platform";

/** In the native app the session lives in native storage, which iOS doesn't clear. */
const nativeStorage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: (key: string, value: string) => Preferences.set({ key, value }),
  removeItem: (key: string) => Preferences.remove({ key }),
};

// import.meta.env is undefined outside Vite (unit tests), which then run without Supabase.
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Null when the app is built without Supabase settings. The app then runs
 * on-device only, with no accounts, as before.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { storage: isNative ? nativeStorage : undefined, persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isNative, flowType: "pkce" },
      })
    : null;

export const cloudEnabled = supabase !== null;

/** Where email links (confirmation and password reset) send the user back to. */
export function appUrl(): string {
  if (isNative) return NATIVE_AUTH_REDIRECT;
  return window.location.origin + window.location.pathname;
}
