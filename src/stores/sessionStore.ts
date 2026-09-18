import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getCurrentSession, signOut } from "../features/auth/auth.service";

type SessionState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null, initialized: true }),
  initialize: async () => {
    const { data, error } = await getCurrentSession();
    if (error) throw error;
    set({ session: data.session, user: data.session?.user ?? null, initialized: true });
  },
  logout: async () => {
    await signOut();
    set({ session: null, user: null, initialized: true });
  },
}));
