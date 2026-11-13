import type { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthState = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
};
export const AuthContext = createContext<AuthState>({ user: null, loading: false, configured: false, error: null });
export const useAuth = () => useContext(AuthContext);
