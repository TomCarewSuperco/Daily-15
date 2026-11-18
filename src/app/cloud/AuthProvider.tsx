import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

interface AuthState {
  session: Session | null;
  loading: boolean;
  /** True after the user arrives from a password-reset email. */
  recovering: boolean;
  finishRecovery: () => void;
}

const Ctx = createContext<AuthState>({ session: null, loading: false, recovering: false, finishRecovery: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, loading, recovering, finishRecovery: () => setRecovering(false) }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
