import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { useDaily15 } from "../store";
import { toast } from "../notify";
import { connectHealth, healthAvailable, healthName, pullHealth } from "./health";
import { isNative } from "./platform";

/** Health connection controls. With `auto`, also syncs when the app opens or returns to the foreground. Use `auto` in one place only. */
export function useHealthSync(auto = false) {
  const { state, update } = useDaily15();
  const [available, setAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const connected = !!state.health?.connected;
  const running = useRef(false);

  useEffect(() => {
    if (isNative) healthAvailable().then(setAvailable);
  }, []);

  const sync = useCallback(
    async (quiet = true) => {
      if (running.current) return;
      running.current = true;
      setSyncing(true);
      try {
        const r = await pullHealth(14);
        update((s) => ({ ...r.next(s), health: { connected: true, lastSync: new Date().toISOString() } }));
        if (!quiet) toast.success(`Synced ${r.days} days of activity from ${healthName}`);
      } catch {
        if (!quiet) toast.error(`Couldn't read from ${healthName}`);
      } finally {
        running.current = false;
        setSyncing(false);
      }
    },
    [update],
  );

  useEffect(() => {
    if (!auto || !isNative || !connected) return;
    sync();
    const sub = App.addListener("appStateChange", ({ isActive }) => isActive && sync());
    return () => {
      sub.then((h) => h.remove());
    };
  }, [auto, connected, sync]);

  const connect = async () => {
    try {
      await connectHealth();
      update((s) => ({ ...s, health: { connected: true } }));
      await sync(false);
    } catch {
      toast.error(`Couldn't connect to ${healthName}`);
    }
  };

  const disconnect = () => update((s) => ({ ...s, health: { connected: false } }));

  return { available, connected, syncing, lastSync: state.health?.lastSync, connect, disconnect, sync: () => sync(false) };
}
