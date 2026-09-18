import { useEffect, useState } from "react";
import { FeedPage } from "../features/feed/FeedPage";
import { AuthPage } from "../features/auth/AuthPage";
import { AuthResetPage } from "../features/auth/AuthResetPage";
import { useSessionStore } from "../stores/sessionStore";
import { requireSupabase } from "../lib/supabase";

export function AppRoutes() {
  const session = useSessionStore((state) => state.session);
  const initialized = useSessionStore((state) => state.initialized);
  const setSession = useSessionStore((state) => state.setSession);
  const initialize = useSessionStore((state) => state.initialize);
  const [reset, setReset] = useState(() => typeof window !== "undefined" && window.location.pathname === "/auth/reset");

  useEffect(() => {
    let mounted = true;
    const client = (() => { try { return requireSupabase(); } catch { return null; } })();
    if (!client) { setSession(null); return; }
    void initialize().catch(() => { if (mounted) setSession(null); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [initialize, setSession]);

  if (reset) return <AuthResetPage onDone={() => { setReset(false); setSession(session); window.history.replaceState({}, "", "/"); }} />;
  if (!initialized) return <div className="auth-loading">Loading Yuniko...</div>;
  if (!session) return <AuthPage onAuthenticated={() => void initialize()} />;
  return <FeedPage />;
}
