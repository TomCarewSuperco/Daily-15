import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches a crash in part of the app and shows a way out, instead of a blank
 * screen. Most often this is a file from an older version that no longer exists
 * after an update; reloading fetches the new version.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DAILY 15 crashed", error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const stale = isStaleChunk(this.state.error);
    return (
      <div className="mx-auto max-w-md px-6 pt-16 text-center">
        <h2 className="text-2xl">{stale ? "There's a new version" : "Something went wrong"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {stale ? "Reload to finish updating. Your data is safe." : "Your data is safe. Reload to try again. If it keeps happening, tell us what you were doing."}
        </p>
        <button className="mt-6 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background" onClick={() => window.location.reload()}>
          Reload
        </button>
        {!stale && <p className="mt-6 break-words text-[11px] text-muted-foreground">{this.state.error.message}</p>}
      </div>
    );
  }
}

export function isStaleChunk(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically|Loading chunk/i.test(m);
}

/**
 * Wraps a lazy import: if the file is missing because the app was updated while
 * open, reload once to fetch the new version.
 */
export function importWithReload<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((e) => {
      const key = "daily15:reloaded-for-update";
      try {
        if (isStaleChunk(e) && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
          return new Promise<T>(() => {});
        }
      } catch {
        /* storage unavailable */
      }
      throw e;
    });
}
