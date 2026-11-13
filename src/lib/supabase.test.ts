import { validateSupabaseConfig } from "./supabase";

it("requires explicit project configuration", () => {
  expect(validateSupabaseConfig(undefined, undefined)).toContain("not configured");
});
it("rejects privileged and legacy keys from the public client configuration", () => {
  for (const key of ["sb_secret_not_real", "eyJnot-a-real-jwt", "service_role", ""]) expect(validateSupabaseConfig("https://project.supabase.co", key)).not.toBeNull();
});
it("allows a publishable key with HTTPS or local development, rejecting other URLs", () => {
  expect(validateSupabaseConfig("https://project.supabase.co", "sb_publishable_test")).toBeNull();
  expect(validateSupabaseConfig("http://127.0.0.1:54321", "sb_publishable_test")).toBeNull();
  expect(validateSupabaseConfig("http://untrusted.test", "sb_publishable_test")).toContain("valid");
  expect(validateSupabaseConfig("javascript:alert(1)", "sb_publishable_test")).toContain("valid");
});
