// Opt-in Phase 5A live acceptance. Changes only the OWNER settings row, then restores its original values.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
assert.equal(env.TRUGEN_RUN_LIVE_CHECKS, "yes", "Explicit live-check opt-in required");
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "TRUGEN_TEST_OWNER_EMAIL", "TRUGEN_TEST_OWNER_PASSWORD", "TRUGEN_TEST_OTHER_EMAIL", "TRUGEN_TEST_OTHER_PASSWORD"]) {
  assert.ok(env[key], `Missing private local variable: ${key}`);
}
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, "jueboylmczhlkrjtdjva.supabase.co");
assert.ok(env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"));

const liveFetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(45_000) });
const makeClient = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: liveFetch },
});
const owner = makeClient(), other = makeClient();
const origin = "http://127.0.0.1:5177";
const check = expect.configure({ timeout: 45_000 });
let server, browser, original, beforeCostings, ownerId;
let restored = false, stage = "authenticate accounts";

async function rpc(client, name, args = {}) {
  const result = await client.rpc(name, args);
  assert.equal(result.error, null, `${name} failed`);
  return result.data;
}

try {
  const ownerLogin = await owner.auth.signInWithPassword({ email: env.TRUGEN_TEST_OWNER_EMAIL, password: env.TRUGEN_TEST_OWNER_PASSWORD });
  const otherLogin = await other.auth.signInWithPassword({ email: env.TRUGEN_TEST_OTHER_EMAIL, password: env.TRUGEN_TEST_OTHER_PASSWORD });
  assert.equal(ownerLogin.error, null, "OWNER authentication failed");
  assert.equal(otherLogin.error, null, "OTHER authentication failed");
  ownerId = ownerLogin.data.user.id;
  assert.notEqual(ownerId, otherLogin.data.user.id, "Test accounts must be distinct");
  console.log("PASS: both distinct live test accounts authenticated.");

  stage = "snapshot existing data and settings";
  original = await rpc(owner, "trugen_get_user_settings");
  beforeCostings = await rpc(owner, "trugen_list_costings", { p_search: "", p_offset: 0 });
  const temporary = {
    defaultMarkup: original.defaultMarkup === "47.89" ? "48.89" : "47.89",
    rounding: original.rounding === "10" ? "5" : "10",
  };
  await rpc(owner, "trugen_save_user_settings", { p_default_markup: temporary.defaultMarkup, p_rounding: temporary.rounding });
  assert.deepEqual(await rpc(owner, "trugen_get_user_settings"), {
    ...temporary, updatedAt: (await rpc(owner, "trugen_get_user_settings")).updatedAt,
  });
  console.log("PASS: OWNER saved temporary markup and rounding defaults.");

  stage = "verify direct account isolation";
  const hidden = await other.from("user_settings").select("owner_id,default_markup_pct,rounding_step").eq("owner_id", ownerId);
  assert.equal(hidden.error, null); assert.deepEqual(hidden.data, []);
  const denied = await other.from("user_settings").update({ rounding_step: "none" }).eq("owner_id", ownerId);
  assert.equal(denied.error?.code, "42501", "OTHER direct write must be denied");
  const unchanged = await rpc(owner, "trugen_get_user_settings");
  assert.equal(unchanged.defaultMarkup, temporary.defaultMarkup);
  assert.equal(unchanged.rounding, temporary.rounding);
  console.log("PASS: OTHER cannot read or modify OWNER settings.");

  stage = "start isolated app";
  const serverEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("TRUGEN_TEST_")));
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5177", "--strictPort"], { env: serverEnv, stdio: "ignore", windowsHide: true });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(250);
    assert.equal(server.exitCode, null, "Isolated app server exited early");
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* startup */ }
  }
  assert.ok(ready, "Isolated app did not start");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(45_000);

  const loginInBrowser = async () => {
    await page.getByLabel("Email address").fill(env.TRUGEN_TEST_OWNER_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(env.TRUGEN_TEST_OWNER_PASSWORD);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await check(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  };
  const expectTemporarySettings = async () => {
    await check(page.getByLabel("Default Tubo / markup (%)")).toHaveValue(temporary.defaultMarkup);
    await check(page.getByLabel("Default selling price rounding")).toHaveValue(temporary.rounding);
  };

  stage = "browser logout and login persistence";
  await page.goto(`${origin}/settings`);
  await check(page).toHaveURL(/\/login$/);
  await loginInBrowser();
  await expectTemporarySettings();
  await page.getByRole("button", { name: "Log out", exact: true }).last().click();
  await check(page).toHaveURL(/\/login$/);
  await page.goto(`${origin}/settings`);
  await loginInBrowser();
  await expectTemporarySettings();
  console.log("PASS: settings persisted through browser logout and login.");

  stage = "new costing defaults";
  await page.goto(`${origin}/new`);
  await check(page.getByLabel("Tubo / markup (%)")).toHaveValue(temporary.defaultMarkup);
  await check(page.getByLabel("Optional price rounding")).toHaveValue(temporary.rounding);
  console.log("PASS: a new blank costing uses the saved OWNER defaults.");
} catch {
  console.error(`Phase 5A live check failed at stage: ${stage}. Private details suppressed.`);
  process.exitCode = 1;
} finally {
  try {
    if (original && ownerId) {
      await rpc(owner, "trugen_save_user_settings", { p_default_markup: original.defaultMarkup, p_rounding: original.rounding });
      const restoredSettings = await rpc(owner, "trugen_get_user_settings");
      assert.equal(restoredSettings.defaultMarkup, original.defaultMarkup);
      assert.equal(restoredSettings.rounding, original.rounding);
      const afterCostings = await rpc(owner, "trugen_list_costings", { p_search: "", p_offset: 0 });
      assert.deepEqual(afterCostings, beforeCostings, "Existing saved costings changed during settings acceptance");
      restored = true;
      console.log("PASS: original OWNER settings restored and existing saved costings remained unchanged.");
    }
  } catch {
    console.error("CRITICAL: original settings or costing snapshot could not be verified after cleanup. Private details suppressed.");
    process.exitCode = 1;
  }
  await browser?.close();
  server?.kill();
  const signouts = await Promise.all([owner.auth.signOut({ scope: "local" }), other.auth.signOut({ scope: "local" })]);
  if (signouts.some(({ error }) => error)) process.exitCode = 1;
}

assert.ok(restored, "Original settings restoration was not verified");
if (!process.exitCode) console.log("Phase 5A live settings acceptance passed with restoration verified.");
