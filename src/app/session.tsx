import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import type { RoutineMode } from "./types";
import type { GymSession } from "./components/GymPlayer";
import { importWithReload } from "./components/ErrorBoundary";

/*
 * The workout in progress lives above the tabs, so it keeps running while the
 * person logs food or checks progress. Minimised, it shows as a bar above the tab
 * bar with what's happening now; tapping the bar brings it back. Timers run off
 * the clock, so nothing is lost while it's out of sight.
 */
type Active = { kind: "routine"; mode: RoutineMode } | { kind: "gym"; session: GymSession };

interface SessionApi {
  active: Active | null;
  minimised: boolean;
  startRoutine: (mode: RoutineMode) => void;
  startGym: (session: GymSession) => void;
  minimise: () => void;
  expand: () => void;
  end: () => void;
  /** What the player is doing now, for the minimised bar ('Push-ups · 0:45'). */
  setStatus: (text: string) => void;
}

const Ctx = createContext<SessionApi | null>(null);

/** The minimised bar's status setter, or a no-op outside a session (players shown on their own). */
export function useSessionStatus(): (text: string) => void {
  return useContext(Ctx)?.setStatus ?? noop;
}
const noop = () => {};

export function useSession(): SessionApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession outside ActiveSessionProvider");
  return c;
}

const RoutinePlayer = lazy(importWithReload(() => import("./components/RoutinePlayer").then((m) => ({ default: m.RoutinePlayer }))));
const GymPlayer = lazy(importWithReload(() => import("./components/GymPlayer").then((m) => ({ default: m.GymPlayer }))));

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const [minimised, setMinimised] = useState(false);
  const [status, setStatus] = useState("");
  const end = useCallback(() => {
    setActive(null);
    setMinimised(false);
    setStatus("");
  }, []);
  const api = useMemo<SessionApi>(
    () => ({
      active,
      minimised,
      startRoutine: (mode) => { setActive({ kind: "routine", mode }); setMinimised(false); },
      startGym: (session) => { setActive({ kind: "gym", session }); setMinimised(false); },
      minimise: () => setMinimised(true),
      expand: () => setMinimised(false),
      end,
      setStatus,
    }),
    [active, minimised, end],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {active && (
        // Kept mounted while minimised (hidden, not removed) so its timers and state carry on.
        <div className={minimised ? "hidden" : ""} key={active.kind === "routine" ? `routine-${active.mode}` : `gym-${active.session.name}`}>
          <Suspense fallback={null}>
            {active.kind === "routine" ? (
              <RoutinePlayer mode={active.mode} onClose={end} minimised={minimised} onMinimise={() => setMinimised(true)} />
            ) : (
              <GymPlayer session={active.session} onClose={end} minimised={minimised} onMinimise={() => setMinimised(true)} />
            )}
          </Suspense>
        </div>
      )}
      {active && minimised && (
        <button
          onClick={() => setMinimised(false)}
          className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center justify-between gap-2 border-t bg-foreground px-4 py-2.5 text-left text-background"
          aria-label="Return to workout"
        >
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-widest opacity-70">{active.kind === "routine" ? "Daily 15 in progress" : active.session.name}</span>
            <span className="block truncate text-sm font-medium tabular-nums">{status || "Tap to return"}</span>
          </span>
          <ChevronUp className="h-5 w-5 shrink-0" />
        </button>
      )}
    </Ctx.Provider>
  );
}
