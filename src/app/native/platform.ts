import { Capacitor } from "@capacitor/core";

/** True inside the iOS or Android app, false in a browser. */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as "ios" | "android" | "web";

/** Custom URL scheme registered in the iOS app for email links. */
export const NATIVE_AUTH_REDIRECT = "daily15://auth-callback";
