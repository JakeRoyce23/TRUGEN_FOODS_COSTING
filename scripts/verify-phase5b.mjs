// Opt-in Phase 5B live acceptance. Creates and removes one random costing UUID.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
assert.equal(env.TRUGEN_RUN_LIVE_CHECKS, "yes", "Explicit live-check opt-in required");
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "TRUGEN_TEST_OWNER_EMAIL", "TRUGEN_TEST_OWNER_PASSWORD"]) assert.ok(env[key], `Missing private local variable: ${key}`);
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, "jueboylmczhlkrjtdjva.supabase.co");
assert.ok(env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"));

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const id = randomUUID(), origin = "http://127.0.0.1:5179";
const input = { foodName: `[Phase 5B verification] ${id}`, servings: "10", markup: "35", rounding: "none", ingredients: [{ id: "fixture", name: "Temporary ingredient", purchasedQuantity: "1", purchaseUnit: "kg", purchasePrice: "1300", usedQuantity: "0.5", usageUnit: "kg" }] };
const check = expect.configure({ timeout: 45_000 });
let browser, server, browserSaveMs, deleteMs, stage = "authenticate", cleanupPassed = false;

async function successfulRpc(name, args) {
  const result = await client.rpc(name, args);
  assert.equal(result.error, null, `${name} failed`);
  return result.data;
}

try {
  const login = await client.auth.signInWithPassword({ email: env.TRUGEN_TEST_OWNER_EMAIL, password: env.TRUGEN_TEST_OWNER_PASSWORD });
  assert.equal(login.error, null, "OWNER authentication failed");
  const versionOne = await successfulRpc("trugen_save_costing", { p_id: id, p_request_id: randomUUID(), p_expected_version: null, p_input: input });
  assert.equal(versionOne.version, 1);

  stage = "start isolated app";
  const serverEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("TRUGEN_TEST_")));
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5179", "--strictPort"], { env: serverEnv, stdio: "ignore", windowsHide: true });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(250); assert.equal(server.exitCode, null, "Isolated app server exited early");
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* startup */ }
  }
  assert.ok(ready, "Isolated app did not start");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(45_000);
  await page.goto(`${origin}/costings/${id}/edit`);
  await check(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(env.TRUGEN_TEST_OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.TRUGEN_TEST_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await check(page.getByLabel("Food / order name")).toHaveValue(input.foodName);

  stage = "create newer server version";
  const newerInput = structuredClone(input); newerInput.ingredients[0].usedQuantity = "0.25";
  const versionTwo = await successfulRpc("trugen_save_costing", { p_id: id, p_request_id: randomUUID(), p_expected_version: 1, p_input: newerInput });
  assert.equal(versionTwo.version, 2);

  stage = "measure stale browser save";
  await page.getByLabel("Food / order name").fill("Unsaved local conflict edit");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/rpc/trugen_save_costing") && response.request().method() === "POST");
  const saveStarted = performance.now();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const saveResponse = await responsePromise; browserSaveMs = performance.now() - saveStarted;
  assert.equal(saveResponse.status(), 409); assert.ok(browserSaveMs < 10_000, "Stale save was not returned promptly");
  await check(page.getByRole("alert")).toContainText("modified elsewhere");
  await check(page.getByRole("button", { name: "Reload latest version", exact: true })).toBeVisible();
  await check(page.getByLabel("Food / order name")).toHaveValue("Unsaved local conflict edit");
  assert.deepEqual(await successfulRpc("trugen_get_costing", { p_id: id }), versionTwo, "Stale save overwrote newer data");

  stage = "measure stale delete";
  const deleteStarted = performance.now();
  const staleDelete = await client.rpc("trugen_delete_costing", { p_id: id, p_expected_version: 1 });
  deleteMs = performance.now() - deleteStarted;
  assert.equal(staleDelete.status, 409); assert.equal(staleDelete.error?.code, "PT409"); assert.ok(deleteMs < 10_000, "Stale delete was not returned promptly");
  assert.deepEqual(await successfulRpc("trugen_get_costing", { p_id: id }), versionTwo, "Stale delete removed or changed newer data");
  console.log(`PASS: stale save returned HTTP 409 in ${browserSaveMs.toFixed(0)} ms; frontend preserved input and showed reload guidance.`);
  console.log(`PASS: stale delete returned HTTP 409/PT409 in ${deleteMs.toFixed(0)} ms; version 2 remained unchanged.`);
} catch {
  console.error(`Phase 5B live check failed at stage: ${stage}. Private details suppressed.`);
  process.exitCode = 1;
} finally {
  try {
    const current = await client.rpc("trugen_get_costing", { p_id: id });
    if (current.data) {
      assert.equal(current.data.foodName, input.foodName, "Cleanup UUID no longer matches this test record");
      const removed = await client.rpc("trugen_delete_costing", { p_id: id, p_expected_version: current.data.version });
      assert.equal(removed.error, null, "Temporary costing cleanup failed");
    } else assert.equal(current.error?.code, "P0002");
    assert.equal((await client.rpc("trugen_get_costing", { p_id: id })).error?.code, "P0002");
    const children = await client.from("costing_ingredients").select("id").eq("costing_id", id);
    assert.equal(children.error, null); assert.deepEqual(children.data, []);
    cleanupPassed = true;
    console.log("PASS: only the generated temporary costing was removed; child cleanup verified.");
  } catch {
    console.error(`CRITICAL: cleanup could not be verified for temporary UUID ${id}.`);
    process.exitCode = 1;
  }
  await browser?.close(); server?.kill();
  if ((await client.auth.signOut({ scope: "local" })).error) process.exitCode = 1;
}

assert.ok(cleanupPassed, "Cleanup was not verified");
if (!process.exitCode) console.log("Phase 5B live conflict acceptance passed.");
