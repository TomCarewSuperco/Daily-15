import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { mergeStates, sameState } from "./cloud/merge";
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
    customFoods: [],
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

/** The last version saved to or loaded from the account. The common ancestor for merges. */
function readBase(key: string): AppState | null {
  return read(`${key}:base`);
}

function writeBase(key: string, s: AppState) {
  try {
    localStorage.setItem(`${key}:base`, JSON.stringify(s));
  } catch {
    /* storage full: merges fall back to treating everything as new */
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

  /** Applies a merged account copy to the device, keeping any edits made while the merge ran. */
  const adoptMerged = useCallback((snapshot: AppState, merged: AppState) => {
    setState((cur) => {
      const next = cur === snapshot ? merged : mergeStates(snapshot, cur, merged);
      const withPhotos = { ...next, photos: cur.photos };
      if (sameState(withPhotos, cur)) return cur;
      if (cur === snapshot) skipNextPush.current = true;
      return withPhotos;
    });
  }, []);

  /**
   * Saves to the account. If another device saved since this one last synced,
   * merges first, then writes only if the row hasn't changed again meanwhile.
   */
  const push = useCallback(async (): Promise<boolean> => {
    if (!userId || !supabase) return true;
    window.clearTimeout(timer.current);
    setStatus("saving");
    for (let attempt = 0; attempt < 3; attempt++) {
      const snapshot = latest.current;
      const meta = readMeta(key);
      const { data: remote, error: readError } = await supabase.from("user_state").select("data, updated_at").eq("user_id", userId).maybeSingle();
      if (readError) break;

      let toSave = forCloud(snapshot);
      if (remote && remote.updated_at !== meta.syncedAt) {
        const remoteState = { ...emptyState(), ...(remote.data as AppState) };
        const base = readBase(key) ?? emptyState();
        toSave = forCloud(mergeStates(forCloud(base), forCloud(snapshot), remoteState));
      }

      const query = remote
        ? supabase.from("user_state").update({ data: toSave }).eq("user_id", userId).eq("updated_at", remote.updated_at).select("updated_at")
        : supabase.from("user_state").insert({ user_id: userId, data: toSave }).select("updated_at");
      const { data: rows, error } = await query;
      if (error && error.code !== "23505") break; // 23505: another device created the row first
      if (!rows?.length) continue; // the row changed under us: merge again

      writeBase(key, toSave);
      writeMeta(key, { dirty: false, syncedAt: rows[0].updated_at });
      adoptMerged(snapshot, toSave);
      setStatus("saved");
      return true;
    }
    setStatus("offline");
    return false;
  }, [userId, key, adoptMerged]);

  /** Fetches the account copy and brings this device up to date. */
  const pull = useCallback(async (): Promise<"updated" | "current" | "pushed" | "failed"> => {
    if (!userId || !supabase) return "current";
    const meta = readMeta(key);
    const { data, error } = await supabase.from("user_state").select("data, updated_at").eq("user_id", userId).maybeSingle();
    if (error) return "failed";
    // Push merges if needed. A device that has never synced but already holds data
    // (from before the account existed) merges it in rather than discarding it.
    const neverSynced = !meta.syncedAt && !!latest.current.profile;
    if (!data || meta.dirty || neverSynced) return (await push()) ? "pushed" : "failed";
    if (data.updated_at === meta.syncedAt) return "current";
    const remoteState = { ...emptyState(), ...(data.data as AppState) };
    const snapshot = latest.current;
    writeBase(key, remoteState);
    writeMeta(key, { dirty: false, syncedAt: data.updated_at });
    adoptMerged(snapshot, { ...remoteState, photos: snapshot.photos });
    return "updated";
  }, [userId, key, push, adoptMerged]);

  // First load: reconcile the device copy with the account.
  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    (async () => {
      const result = await pull();
      if (cancelled) return;
      if (result === "failed") setStatus("offline");
      else {
        setStatus("saved");
        if (result === "pushed" && fromLegacy.current) {
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
  }, [userId, pull]);

  // Pick up changes from other devices when the app comes back to the foreground.
  useEffect(() => {
    if (!userId || !ready) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, ready, pull]);

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
    localStorage.removeItem(`${key}:base`);
  } catch {
    /* nothing to clear */
  }
}
