// Recovery is intercepted against supabase.test; NEVER sends mail or changes live users.
import { expect, test, type Page } from "@playwright/test";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "recovery@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" };
function token() {
  return `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })).toString("base64url")}.${Buffer.from("fixture-signature").toString("base64url")}`;
}
function callback(path = "/reset-password") { return `${path}#type=recovery&access_token=${token()}&refresh_token=fixture-refresh`; }
async function mockRecovery(page: Page) {
  const state = { updates: 0, recoveries: 0, failUpdate: false, invalidUser: false, otherUser: false, signouts: 0, redirect: "" };
  await page.route("https://supabase.test/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const ok = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.endsWith("/recover")) { state.recoveries++; state.redirect = url.searchParams.get("redirect_to") ?? ""; return ok({}); }
    if (url.pathname.endsWith("/logout")) { state.signouts++; return ok({}); }
    if (url.pathname.endsWith("/user") && request.method() === "PUT") {
      state.updates++;
      expect(request.postDataJSON()).toMatchObject({ password: "fixture-new-passphrase" });
      if (state.failUpdate) return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ code: "weak_password", error_code: "weak_password", message: "Weak password" }) });
      return ok(user);
    }
    if (url.pathname.endsWith("/user")) {
      if (state.invalidUser) return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "bad_jwt", error_code: "bad_jwt", message: "Invalid token" }) });
      return ok(state.otherUser ? { ...user, id: "22222222-2222-4222-8222-222222222222" } : user);
    }
    return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "invalid_grant", error_code: "invalid_grant", message: "Invalid test callback" }) });
  });
  return state;
}

test("recovery requests use the exact reset URL and an account-neutral success message", async ({ page }) => {
  const state = await mockRecovery(page);
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("alert")).toContainText("valid email");
  expect(state.recoveries).toBe(0);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  expect(state.redirect).toBe(new URL("/reset-password", page.url()).href);
  expect(state.recoveries).toBe(1);
});

test("recovery validates the link, confirms passwords, updates once and signs out", async ({ page }, testInfo) => {
  const state = await mockRecovery(page);
  await page.goto(callback());
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("type", "password");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/qa/phase4-recovery-${testInfo.project.name}.png`, fullPage: true });
  await page.getByLabel("New password", { exact: true }).fill("fixture-new-passphrase");
  await page.getByLabel("Confirm new password").fill("different");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  expect(state.updates).toBe(0);
  await page.getByLabel("Confirm new password").fill("fixture-new-passphrase");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your password was updated");
  await expect.poll(() => state.signouts).toBe(1);
  expect(state.updates).toBe(1);
  await page.getByRole("link", { name: "Back to login" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("Site URL callbacks reach reset, failed updates remain retryable, refresh fails closed", async ({ page }) => {
  const state = await mockRecovery(page);
  await page.goto(callback("/"));
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password", { exact: true }).fill("fixture-new-passphrase");
  await page.getByLabel("Confirm new password").fill("fixture-new-passphrase");
  state.failUpdate = true;
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("stronger password");
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("missing, expired");
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(state.updates).toBe(1);
});

test("missing, expired and rejected links cannot update any user", async ({ page }) => {
  const state = await mockRecovery(page);
  for (const url of ["/reset-password", "/#error=access_denied&error_code=otp_expired&error_description=untrusted-text", "/reset-password?code=invalid-fixture", "/reset-password?token_hash=invalid-fixture&type=recovery"]) {
    await page.goto(url);
    await expect(page.getByRole("alert")).toContainText("missing, expired");
    await expect(page.getByRole("button", { name: "Update password", exact: true })).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe("");
    expect(new URL(page.url()).search).toBe("");
    await expect(page.locator("body")).not.toContainText("untrusted-text");
  }
  state.invalidUser = true;
  await page.goto("/login");
  await page.goto(callback());
  await expect(page.getByRole("alert")).toContainText("missing, expired");
  expect(state.updates).toBe(0);
  state.invalidUser = false;
  await page.goto("/forgot-password");
  await page.goto(callback());
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  state.otherUser = true;
  await page.getByLabel("New password", { exact: true }).fill("fixture-new-passphrase");
  await page.getByLabel("Confirm new password").fill("fixture-new-passphrase");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("missing, expired");
  expect(state.updates).toBe(0);
});
