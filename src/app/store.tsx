import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "./cloud/client";
import { DEFAULT_REMINDERS, DEFAULT_ROUTINE } from "./data";
import { toast } from "./notify";
import type { AppState } from "./types";

/** Device-only data, used when the app runs without accounts. */
export const LOCAL_KEY = "daily15:v1";
export const userKey = (userId: string) => `daily15:v1:${userId}`;

export function emptyState(): AppState {
  return {
    version: 1,
    profile: null,
    routine: DEFAULT_ROUTINE,
    routineLogs: {},
    restDays: [],
    workouts: [],
    templates: [],
    foods: [],
    savedMeals: [],
    water: {},
    activity: {},
    weights: [],
    measurements: [],
    photos: [],
    reminders: DEFAULT_REMINDERS,
  };
}

function read(key: string): AppState | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

interface SyncMeta {
  /** Local changes not yet saved to the account. */
  dirty: boolean;
  /** Server timestamp of the last successful save or load. */
  syncedAt: string | null;
}

function readMeta(key: string): SyncMeta {
  try {
    return { dirty: false, syncedAt: null, ...JSON.parse(localStorage.getItem(`${key}:meta`) ?? "{}") };
  } catch {
    return { dirty: false, syncedAt: null };
  }
}

function writeMeta(key: string, m: SyncMeta) {
  try {
    localStorage.setItem(`${key}:meta`, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}

export type SyncStatus = "local" | "loading" | "saved" | "saving" | "offline";

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  sync: { ready: boolean; status: SyncStatus; flush: () => Promise<boolean> };
}

const Ctx = createContext<Store | null>(null);

/** Progress photos stay on the device. They are too large to sync with every change. */
const forCloud = (s: AppState): AppState => ({ ...s, photos: [] });

export function Daily15Provider({ children, userId }: { children: ReactNode; userId?: string }) {
  const key = userId ? userKey(userId) : LOCAL_KEY;
  const [state, setState] = useState<AppState>(() => read(key) ?? (userId ? read(LOCAL_KEY) : null) ?? emptyState());
  const [ready, setReady] = useState(!userId);
  // Device-only data from before the user had an account, moved into the account on first sign-in.
  const fromLegacy = useRef(!!userId && !read(key) && !!read(LOCAL_KEY));
  const [status, setStatus] = useState<SyncStatus>(userId ? "loading" : "local");
  const warned = useRef(false);
  const skipNextPush = useRef(false);
  const timer = useRef<number>();
  const latest = useRef(state);
  latest.current = state;

  // Persist on device.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      warned.current = false;
    } catch {
      if (!warned.current) {
        warned.current = true;
        toast.error("Storage is full. Delete some progress photos or export and clear old data.");
      }
    }
  }, [state, key]);

  const push = useCallback(async (): Promise<boolean> => {
    if (!userId || !supabase) return true;
    window.clearTimeout(timer.current);
    setStatus("saving");
    const { data, error } = await supabase
      .from("user_state")
      .upsert({ user_id: userId, data: forCloud(latest.current) })
      .select("updated_at")
      .single();
    if (error) {
      setStatus("offline");
      return false;
    }
    writeMeta(key, { dirty: false, syncedAt: data.updated_at });
    setStatus("saved");
    return true;
  }, [userId, key]);

  // First load: reconcile the device copy with the account.
  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    (async () => {
      const meta = readMeta(key);
      const { data, error } = await supabase.from("user_state").select("data, updated_at").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        // Work from the device copy and retry later.
        setStatus("offline");
        setReady(true);
        return;
      }
      const cloudNewer = data && (!meta.syncedAt || data.updated_at > meta.syncedAt);
      if (data && (cloudNewer || !meta.dirty)) {
        skipNextPush.current = true;
        setState((local) => ({ ...emptyState(), ...(data.data as AppState), photos: local.photos }));
        writeMeta(key, { dirty: false, syncedAt: data.updated_at });
        if (cloudNewer && meta.dirty) toast("Your account had newer changes from another device, so this device has been updated.");
        setStatus("saved");
      } else {
        // No account data yet, or unsaved changes here that are newer: upload.
        const saved = await push();
        if (saved && !data && fromLegacy.current) {
          try {
            localStorage.removeItem(LOCAL_KEY);
          } catch {
            /* ignore */
          }
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, key, push]);

  // After load, save changes to the account shortly after they stop.
  useEffect(() => {
    if (!userId || !ready) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    writeMeta(key, { ...readMeta(key), dirty: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(push, 1500);
    return () => window.clearTimeout(timer.current);
  }, [state, userId, ready, key, push]);

  // Retry unsaved changes when the connection returns, and every minute.
  useEffect(() => {
    if (!userId) return;
    const retry = () => readMeta(key).dirty && push();
    window.addEventListener("online", retry);
    const id = window.setInterval(retry, 60_000);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(id);
    };
  }, [userId, key, push]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  const replace = useCallback((s: AppState) => setState(s), []);

  return <Ctx.Provider value={{ state, update, replace, sync: { ready, status, flush: push } }}>{children}</Ctx.Provider>;
}

export function useDaily15(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDaily15 must be used inside Daily15Provider");
  return v;
}

export function clearStorage(userId?: string) {
  const key = userId ? userKey(userId) : LOCAL_KEY;
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}:meta`);
  } catch {
    /* nothing to clear */
  }
}
