import { createClient } from "@supabase/supabase-js";

export function validateSupabaseConfig(url: string | undefined, key: string | undefined): string | null {
  if (!url || !key) return "Supabase is not configured. Follow docs/SUPABASE_SETUP.md to connect your project.";
  if (!key.startsWith("sb_publishable_")) return "Use the Supabase publishable key. Secret and service-role keys must never be used in this app.";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) throw new Error();
  } catch {
    return "Set a valid Supabase project URL in .env.local.";
  }
  return null;
}

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigError = validateSupabaseConfig(url, key);
export const supabase = supabaseConfigError ? null : createClient(url!, key!, {
  // Recovery callbacks are explicitly consumed and verified by password-recovery.ts.
  // Automatic detection would race that one-time exchange and the route guards.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured.");
  return supabase;
}
