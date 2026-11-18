import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "./notify";
import { DEFAULT_REMINDERS, DEFAULT_ROUTINE } from "./data";
import type { AppState } from "./types";

const KEY = "daily15:v1";

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

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    return emptyState();
  }
}

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
}

const Ctx = createContext<Store | null>(null);

export function Daily15Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const warned = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      warned.current = false;
    } catch {
      if (!warned.current) {
        warned.current = true;
        toast.error("Storage is full. Delete some progress photos or export and clear old data.");
      }
    }
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  const replace = useCallback((s: AppState) => setState(s), []);

  return <Ctx.Provider value={{ state, update, replace }}>{children}</Ctx.Provider>;
}

export function useDaily15(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDaily15 must be used inside Daily15Provider");
  return v;
}

export function clearStorage() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
