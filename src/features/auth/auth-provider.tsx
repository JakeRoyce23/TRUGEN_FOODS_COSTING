import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, type ReactNode } from "react";

import { supabase, supabaseConfigError } from "../../lib/supabase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children, client = supabase }: { children: ReactNode; client?: SupabaseClient | null }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let alive = true;
    let eventVersion = 0;
    function apply(next: Session | null) {
      if (!alive) return;
      const expired = next && (!next.expires_at || next.expires_at * 1000 <= Date.now());
      setSession(expired ? null : next);
      setError(expired ? "Your session expired. Please sign in again." : null);
      setLoading(false);
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      eventVersion += 1;
      apply(next);
    });
    const version = eventVersion;
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive || eventVersion !== version) return;
      apply(data.session);
      if (sessionError) setError("Your session could not be restored. Please sign in again.");
    }).catch(() => {
      if (alive && eventVersion === version) {
        setLoading(false);
        setError("Your session could not be restored. Check your connection and sign in again.");
      }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    if (!session?.expires_at) return;
    const deadline = session.expires_at * 1000;
    let timeout: number;
    function checkExpiry() {
      const remaining = deadline - Date.now();
      if (remaining > 0) timeout = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
      else {
        setSession(null);
        setError("Your session expired. Please sign in again.");
      }
    }
    timeout = window.setTimeout(checkExpiry, Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)));
    return () => window.clearTimeout(timeout);
  }, [session]);

  return <AuthContext.Provider value={{ user: session?.user ?? null, loading, configured: Boolean(client), error: client ? error : supabaseConfigError }}>{children}</AuthContext.Provider>;
}
