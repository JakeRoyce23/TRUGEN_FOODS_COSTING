// Opt-in REAL browser acceptance. No mocks, traces, recordings, or saved sessions.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
assert.equal(env.TRUGEN_RUN_LIVE_CHECKS, "yes", "Explicit live-check opt-in required");
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, "jueboylmczhlkrjtdjva.supabase.co");
assert.ok(env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"));
const account = process.argv.includes("--other-account") ? "OTHER" : "OWNER";
const email = env[`TRUGEN_TEST_${account}_EMAIL`];
const password = env[`TRUGEN_TEST_${account}_PASSWORD`];
const secondaryEmail = env.TRUGEN_TEST_OTHER_EMAIL;
const secondaryPassword = env.TRUGEN_TEST_OTHER_PASSWORD;
assert.ok(email && password, "Configure the selected private test account");
if (account === "OWNER") assert.ok(secondaryEmail && secondaryPassword, "Configure the secondary private test account");
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const name = `[Live browser test] ${randomUUID()}`;
const origin = "http://127.0.0.1:5176";
let server, browser, id, stage = "authenticate cleanup session", passed = false, cleanupPassed = false;
const check = expect.configure({ timeout: 45000 });
async function amounts(page, edited = false) {
  const values = edited ? ["325.00", "113.75", "438.75", "32.50", "43.88", "440.00", "44.00", "115.00"] : ["650.00", "227.50", "877.50", "65.00", "87.75", "880.00", "88.00", "230.00"];
  const ids = ["total-cost", "calculated-profit", "exact-price", "cost-per-serving", "exact-per-serving", "rounded-price", "rounded-per-serving", "rounded-profit"];
  for (let i = 0; i < ids.length; i++) await check(page.getByTestId(ids[i])).toHaveText(`₱${values[i]}`);
}
try {
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null, "Selected account authentication failed");
  stage = "start isolated Vite server";
  const serverEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("TRUGEN_TEST_")));
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5176", "--strictPort"], { env: serverEnv, stdio: "ignore", windowsHide: true });
  server.on("error", () => { process.exitCode = 1; });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    await delay(250);
    assert.equal(server.exitCode, null, "Isolated server exited; do not reuse another process");
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* startup */ }
  }
  assert.ok(ready);
  stage = "launch Chrome";
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on("request", (request) => {
    if (request.url().endsWith("/rpc/trugen_save_costing") && request.method() === "POST") {
      const input = request.postDataJSON();
      if (input.p_input?.foodName === name && /^[0-9a-f-]{36}$/i.test(input.p_id)) id = input.p_id;
    }
  });
  stage = "browser login and protected route";
  await page.goto(`${origin}/history`);
  await check(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await check(page.getByRole("heading", { name: "Costing history", exact: true })).toBeVisible();
  console.log(`PASS: ${account} browser login and protected route.`);
  stage = "create approved example";
  await page.goto(`${origin}/new`);
  for (const [label, value] of [["Food / order name", name], ["Number of servings", "10"], ["Ingredient name", "Temporary chicken"], ["Purchased quantity", "1"], ["Purchase price (₱)", "1300"], ["Actual quantity used", "0.5"]]) await page.getByLabel(label, { exact: true }).fill(value);
  await check(page.getByLabel("Tubo / markup (%)")).toHaveValue("35");
  await check(page.getByLabel("Optional price rounding")).toHaveValue("none");
  await page.getByLabel("Optional price rounding").selectOption("10");
  await amounts(page);
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await check(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
  assert.ok(id, "Track only this run's temporary UUID");
  console.log("PASS: browser save and approved financial values.");
  stage = "saved record refresh persistence";
  await page.reload();
  await check(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await amounts(page);
  await check(page.getByText("Purchased: 1 kg for ₱1,300.00")).toBeVisible();
  console.log("PASS: saved ingredient quantities/prices and refresh persistence.");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow at ${width}`);
  }
  stage = "edit and refresh";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Edit costing", exact: true }).click();
  await page.getByLabel("Actual quantity used").fill("0.25");
  await amounts(page, true);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await check(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
  await page.reload();
  await amounts(page, true);
  await page.screenshot({ path: "docs/qa/phase4-live-mobile.png", fullPage: true, mask: [page.getByText(email, { exact: true })] });
  console.log("PASS: browser edit, recalculation, save, and refresh persistence.");
  if (account === "OWNER") {
    stage = "secondary-account UI isolation and logout";
    const secondaryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const secondaryPage = await secondaryContext.newPage();
    secondaryPage.setDefaultTimeout(45000);
    await secondaryPage.goto(`${origin}/history`);
    await check(secondaryPage).toHaveURL(/\/login$/);
    await secondaryPage.getByLabel("Email address").fill(secondaryEmail);
    await secondaryPage.getByLabel("Password", { exact: true }).fill(secondaryPassword);
    await secondaryPage.getByRole("button", { name: "Log in", exact: true }).click();
    await check(secondaryPage.getByRole("heading", { name: "Costing history", exact: true })).toBeVisible();
    await secondaryPage.getByLabel("Search saved costings").fill(name);
    await check(secondaryPage.getByTestId("saved-costing-card").filter({ hasText: name })).toHaveCount(0);
    await secondaryPage.goto(`${origin}/costings/${id}`);
    await check(secondaryPage.getByRole("alert")).toContainText("unavailable");
    await check(secondaryPage.getByText("Temporary chicken", { exact: true })).toHaveCount(0);
    await secondaryPage.goto(`${origin}/costings/${id}/edit`);
    await check(secondaryPage.getByRole("alert")).toContainText("unavailable");
    await check(secondaryPage.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
    await secondaryPage.goto(`${origin}/settings`);
    await secondaryPage.getByRole("button", { name: "Log out", exact: true }).last().click();
    await check(secondaryPage).toHaveURL(/\/login$/);
    await secondaryPage.goto(`${origin}/history`);
    await check(secondaryPage).toHaveURL(/\/login$/);
    await secondaryContext.close();
    await page.reload();
    await amounts(page, true);
    console.log("PASS: secondary browser login/logout, hidden history, unavailable view/edit, and unchanged owner record.");
  }
  stage = "history, cancel deletion, confirm deletion";
  await page.goto(`${origin}/history`);
  await page.getByLabel("Search saved costings").fill(name);
  const card = page.getByTestId("saved-costing-card").filter({ hasText: name });
  await check(card).toHaveCount(1);
  await check(card).toContainText("₱438.75");
  page.once("dialog", (dialog) => dialog.dismiss());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await check(card).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.message().includes(name) ? dialog.accept() : dialog.dismiss());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await check(card).toHaveCount(0);
  await page.reload();
  await page.getByLabel("Search saved costings").fill(name);
  await check(page.getByRole("heading", { name: "No matching costings", exact: true })).toBeVisible();
  await page.goto(`${origin}/costings/${id}`);
  await check(page.getByRole("alert")).toContainText("unavailable");
  console.log("PASS: cancel/confirm delete, history refresh, and unavailable deleted detail.");
  stage = "logout and signed-out refresh";
  await page.goto(`${origin}/settings`);
  await page.getByRole("button", { name: "Log out", exact: true }).last().click();
  await check(page).toHaveURL(/\/login$/);
  for (const path of ["history", "new"]) {
    await page.goto(`${origin}/${path}`);
    await check(page).toHaveURL(/\/login$/);
  }
  await page.reload();
  await check(page).toHaveURL(/\/login$/);
  console.log(`PASS: ${account} browser logout and signed-out protected routes.`);
  passed = true;
} catch {
  // Never print Playwright call logs: they may include filled credentials.
  console.error(`Live browser check failed at stage: ${stage}. Private error details suppressed.`);
  process.exitCode = 1;
} finally {
  try {
    if (id) {
      const existing = await client.rpc("trugen_get_costing", { p_id: id });
      if (existing.data) {
        assert.equal(existing.data.foodName, name, "Cleanup must match this run's name");
        const removed = await client.rpc("trugen_delete_costing", { p_id: id, p_expected_version: existing.data.version });
        assert.equal(removed.error, null);
      } else assert.equal(existing.error?.code, "P0002");
      assert.equal((await client.rpc("trugen_get_costing", { p_id: id })).error?.code, "P0002");
      const children = await client.from("costing_ingredients").select("id").eq("costing_id", id);
      assert.equal(children.error, null);
      assert.deepEqual(children.data, []);
    }
    assert.equal((await client.auth.signOut({ scope: "local" })).error, null);
    cleanupPassed = true;
  } catch {
    console.error(`Cleanup could not be verified; inspect only temporary UUID ${id ?? "not created"}.`);
    process.exitCode = 1;
  }
  await browser?.close();
  server?.kill();
}
if (passed && cleanupPassed) console.log(`PASS (${account} primary): live browser login, save, eight financial values, refresh persistence, edit, history, cancel/confirm delete, child cleanup, logout, protected routes, and overflow checks at 320/390/768/1440px.${account === "OWNER" ? " Secondary-account UI isolation and logout also passed." : ""}`);
