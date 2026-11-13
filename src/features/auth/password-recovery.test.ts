import type { SupabaseClient } from "@supabase/supabase-js";
import { parseRecoveryCallback, passwordError, preparePasswordRecovery, recoveryRedirectUrl, verifyRecoveryCallback } from "./password-recovery";

function fakeClient() {
  const user = { id: "recovery-user" };
  const auth = {
    setSession: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user, redirectType: "recovery" }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
  };
  return { auth, client: { auth } as unknown as SupabaseClient };
}

afterEach(() => { window.history.replaceState(null, "", "/"); });

it.each(["/reset-password", "/reset-password#type=signup&access_token=fake&refresh_token=fake", "/reset-password#error_code=otp_expired&error_description=untrusted", "/reset-password#type=recovery&access_token=fake", "/reset-password?type=signup&token_hash=fake"])("rejects missing, malformed, or non-recovery links: %s", async (path) => {
  const { auth, client } = fakeClient();
  const input = parseRecoveryCallback(new URL(path, "http://localhost"));
  expect(await verifyRecoveryCallback(client, input)).toBeNull();
  expect(auth.setSession).not.toHaveBeenCalled();
  expect(auth.getUser).not.toHaveBeenCalled();
});

it("validates an implicit recovery session with Auth before allowing a reset", async () => {
  const { auth, client } = fakeClient();
  expect(await verifyRecoveryCallback(client, { kind: "tokens", access: "fake", refresh: "fake-refresh" })).toEqual({ id: "recovery-user" });
  expect(auth.setSession).toHaveBeenCalledWith({ access_token: "fake", refresh_token: "fake-refresh" });
  auth.getUser.mockResolvedValue({ data: { user: { id: "another-user" } }, error: null });
  expect(await verifyRecoveryCallback(client, { kind: "tokens", access: "fake", refresh: "fake-refresh" })).toBeNull();
});

it("rejects a failed token exchange without trusting an existing session", async () => {
  const { auth, client } = fakeClient();
  auth.setSession.mockResolvedValue({ data: { user: null }, error: { code: "bad_jwt" } });
  expect(await verifyRecoveryCallback(client, { kind: "tokens", access: "expired", refresh: "invalid" })).toBeNull();
  expect(auth.getUser).not.toHaveBeenCalled();
});

it("only accepts a PKCE exchange marked as recovery by the SDK", async () => {
  const { auth, client } = fakeClient();
  const input = parseRecoveryCallback(new URL("http://localhost/reset-password?code=fake&sb_flow_id=fixture-flow"));
  expect(await verifyRecoveryCallback(client, input)).toEqual({ id: "recovery-user" });
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("fake", { flowId: "fixture-flow" });
  auth.exchangeCodeForSession.mockResolvedValue({ data: { user: { id: "recovery-user" }, redirectType: null }, error: null });
  expect(await verifyRecoveryCallback(client, { kind: "code", code: "fake" })).toBeNull();
});

it("verifies token hashes with recovery type and handles unavailable Auth safely", async () => {
  const { auth, client } = fakeClient();
  expect(await verifyRecoveryCallback(client, { kind: "hash", hash: "fake" })).toEqual({ id: "recovery-user" });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "fake" });
  auth.verifyOtp.mockRejectedValue(new Error("network failure"));
  expect(await verifyRecoveryCallback(client, { kind: "hash", hash: "fake" })).toBeNull();
});

it("moves Site URL recovery callbacks to the reset route and removes credentials from the URL", () => {
  window.history.replaceState(null, "", "/#type=recovery&access_token=fake&refresh_token=fake");
  preparePasswordRecovery();
  expect(window.location.pathname).toBe("/reset-password");
  expect(window.location.hash).toBe("");
  expect(window.location.search).toBe("");
  expect(recoveryRedirectUrl()).toBe(`${window.location.origin}/reset-password`);
});

it("validates matching passwords without silently trimming them", () => {
  expect(passwordError("short", "short")).toMatch(/8 characters/);
  expect(passwordError("fixture-passphrase", "different")).toMatch(/do not match/);
  expect(passwordError(" fixture-passphrase ", "fixture-passphrase")).toMatch(/do not match/);
  expect(passwordError("fixture-passphrase", "fixture-passphrase")).toBeNull();
});
