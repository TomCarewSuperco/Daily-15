import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { supabase } from "../cloud/client";
import { hydrate, mirrorLocalStorage } from "./durable";
import { isNative, NATIVE_AUTH_REDIRECT } from "./platform";

/** Native-only start-up. Safe to call in the browser, where it does nothing. */
export async function bootstrapNative(): Promise<void> {
  if (!isNative) return;
  await hydrate();
  mirrorLocalStorage();
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});

  // Email confirmation and password-reset links open the app through its URL scheme.
  App.addListener("appUrlOpen", async ({ url }) => {
    if (!supabase || !url.startsWith(NATIVE_AUTH_REDIRECT)) return;
    const params = new URL(url.replace(/^daily15:\/\//, "https://app/")).searchParams;
    const code = params.get("code");
    if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => {});
  });
}

export function hideSplash() {
  if (isNative) SplashScreen.hide().catch(() => {});
}
