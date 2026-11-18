import { Preferences } from "@capacitor/preferences";
import { isNative } from "./platform";

/*
 * iOS can clear a web view's localStorage when the phone runs low on space.
 * In the native app every app key is mirrored to Preferences (UserDefaults),
 * and restored into localStorage before the app renders. The app keeps
 * reading localStorage synchronously, as in the browser.
 */

const PREFIXES = ["daily15:"];
const owned = (key: string) => PREFIXES.some((p) => key.startsWith(p));

export async function hydrate(): Promise<void> {
  if (!isNative) return;
  try {
    const { keys } = await Preferences.keys();
    await Promise.all(
      keys.filter(owned).map(async (key) => {
        if (localStorage.getItem(key) !== null) return;
        const { value } = await Preferences.get({ key });
        if (value !== null) localStorage.setItem(key, value);
      }),
    );
  } catch {
    /* fall back to whatever localStorage holds */
  }
}

/** Mirrors writes and removals of app keys to native storage. Call once at start-up. */
export function mirrorLocalStorage(): void {
  if (!isNative) return;
  const proto = Storage.prototype;
  const set = proto.setItem;
  const remove = proto.removeItem;
  proto.setItem = function (key: string, value: string) {
    set.call(this, key, value);
    if (this === localStorage && owned(key)) Preferences.set({ key, value }).catch(() => {});
  };
  proto.removeItem = function (key: string) {
    remove.call(this, key);
    if (this === localStorage && owned(key)) Preferences.remove({ key }).catch(() => {});
  };
}
