import type { SupabaseClient, User } from "@supabase/supabase-js";
import { requireSupabase } from "../../lib/supabase";

type Callback = { kind: "invalid" } | { kind: "tokens"; access: string; refresh: string } | { kind: "code"; code: string; flowId?: string } | { kind: "hash"; hash: string };

export function parseRecoveryCallback(url: URL): Callback {
  const hash = new URLSearchParams(url.hash.slice(1));
  const query = url.searchParams;
  if ([hash, query].some((params) => params.has("error") || params.has("error_code"))) return { kind: "invalid" };
  if (hash.get("type") === "recovery" && hash.get("access_token") && hash.get("refresh_token")) {
    return { kind: "tokens", access: hash.get("access_token")!, refresh: hash.get("refresh_token")! };
  }
  if (query.get("type") === "recovery" && query.get("token_hash")) return { kind: "hash", hash: query.get("token_hash")! };
  if (query.get("code")) return { kind: "code", code: query.get("code")!, flowId: query.get("sb_flow_id") ?? undefined };
  return { kind: "invalid" };
}

let callback: Callback = { kind: "invalid" };
let recovery: Promise<User | null> | undefined;

// Run before BrowserRouter mounts. Dashboard-generated links can land on Site URL.
// Keep callback material only in memory; never log it or store it separately.
export function preparePasswordRecovery() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const isCallback = url.pathname === "/reset-password" || hash.get("type") === "recovery" || url.searchParams.get("type") === "recovery"
    || url.searchParams.has("code") || [hash, url.searchParams].some((params) => params.has("error_code") || params.has("error"));
  if (!isCallback) return;
  callback = parseRecoveryCallback(url);
  window.history.replaceState(window.history.state, "", "/reset-password");
}

export async function verifyRecoveryCallback(client: SupabaseClient, input: Callback): Promise<User | null> {
  if (input.kind === "invalid") return null; // Never fall back to an unrelated existing session.
  try {
    let user: User | null = null;
    if (input.kind === "tokens") {
      const result = await client.auth.setSession({ access_token: input.access, refresh_token: input.refresh });
      if (result.error) return null;
      user = result.data.user;
    } else if (input.kind === "hash") {
      const result = await client.auth.verifyOtp({ token_hash: input.hash, type: "recovery" });
      if (result.error) return null;
      user = result.data.user;
    } else {
      const result = await client.auth.exchangeCodeForSession(input.code, input.flowId === undefined ? undefined : { flowId: input.flowId });
      if (result.error || !("redirectType" in result.data) || result.data.redirectType !== "recovery") return null;
      user = result.data.user;
    }
    const verified = await client.auth.getUser();
    return !verified.error && user && verified.data.user?.id === user.id ? verified.data.user : null;
  } catch { return null; }
}

export function getRecoveryUser(): Promise<User | null> {
  // Share the one-time exchange across React StrictMode effect replays.
  if (!recovery) {
    const input = callback;
    callback = { kind: "invalid" };
    recovery = verifyRecoveryCallback(requireSupabase(), input);
  }
  return recovery;
}

export function clearRecovery() {
  callback = { kind: "invalid" };
  recovery = Promise.resolve(null);
}

export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return "Use at least 8 characters for your new password.";
  if (password !== confirmation) return "The passwords do not match. Please enter them again.";
  return null;
}

export function recoveryRedirectUrl() {
  return new URL("/reset-password", window.location.origin).href;
}
