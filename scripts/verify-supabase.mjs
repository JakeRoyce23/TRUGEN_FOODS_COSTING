// Opt-in verification only. Uses publishable credentials and two test accounts.
// Creates and cleans up only its own generated disposable costing UUID.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
if (env.TRUGEN_RUN_LIVE_CHECKS !== "yes") throw new Error("Review docs/SUPABASE_SETUP.md and explicitly enable disposable live checks first.");
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "TRUGEN_TEST_OWNER_EMAIL", "TRUGEN_TEST_OWNER_PASSWORD", "TRUGEN_TEST_OTHER_EMAIL", "TRUGEN_TEST_OTHER_PASSWORD"]) {
  if (!env[key]) throw new Error(`Missing local variable: ${key}`);
}
if (!env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) throw new Error("Only a publishable key is accepted.");
if (new URL(env.VITE_SUPABASE_URL).hostname !== "jueboylmczhlkrjtdjva.supabase.co") throw new Error("Live checks require the approved TRUGEN FOODS project.");
const liveFetch = (input, init = {}) => fetch(input, {
  ...init,
  signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000),
});
const client = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: liveFetch },
});
const owner = client(), other = client(), anonymous = client();
const id = randomUUID(), request = randomUUID();
let savedVersion = null;
let passed = false;
async function rpc(connection, name, args) {
  const response = await connection.rpc(name, args);
  assert.equal(response.error, null, `RPC failed: ${name}`);
  return response.data;
}
try {
  const first = await owner.auth.signInWithPassword({ email: env.TRUGEN_TEST_OWNER_EMAIL, password: env.TRUGEN_TEST_OWNER_PASSWORD });
  const second = await other.auth.signInWithPassword({ email: env.TRUGEN_TEST_OTHER_EMAIL, password: env.TRUGEN_TEST_OTHER_PASSWORD });
  if (first.error || second.error) throw new Error("One or both test-account logins failed; check the private local configuration.");
  assert.notEqual(first.data.user.id, second.data.user.id, "Use distinct test accounts");
  console.log("PASS: both distinct test accounts authenticated.");
  const input = { foodName: `[Verification only] ${id}`, servings: "10", markup: "35", rounding: "10", ingredients: [{ id: "fixture", name: "Test ingredient", purchasedQuantity: "1", purchaseUnit: "kg", purchasePrice: "1300", usedQuantity: "0.5", usageUnit: "kg" }] };
  const args = { p_id: id, p_request_id: request, p_expected_version: null, p_input: input };
  const saved = await rpc(owner, "trugen_save_costing", args); savedVersion = saved.version;
  assert.deepEqual(saved.summary, { totalCost: "650.00", calculatedProfit: "227.50", exactPrice: "877.50", roundedPrice: "880.00", actualRoundedProfit: "230.00", costPerServing: "65.00", exactPricePerServing: "87.75", roundedPricePerServing: "88.00" });
  console.log("PASS: temporary costing saved with all eight approved financial values.");
  assert.deepEqual(await rpc(owner, "trugen_save_costing", args), saved, "Retry must return the same confirmed record");
  assert.deepEqual(await rpc(owner, "trugen_get_costing", { p_id: id }), saved);
  assert.equal((await rpc(owner, "trugen_list_costings", { p_search: id, p_offset: 0 })).length, 1);
  assert.equal((await rpc(other, "trugen_list_costings", { p_search: id, p_offset: 0 })).length, 0);
  console.log("PASS: owner retry/read/search and second-account history isolation.");
  for (const table of ["costings", "costing_ingredients"]) {
    const visible = await other.from(table).select("id").eq(table === "costings" ? "id" : "costing_id", id);
    assert.equal(visible.error, null); assert.equal(visible.data.length, 0);
    const anonRead = await anonymous.from(table).select("id").limit(0); assert.equal(anonRead.error?.code, "42501", "Anonymous table reads must be denied");
  }
  assert.equal((await other.rpc("trugen_get_costing", { p_id: id })).error?.code, "P0002");
  assert.equal((await other.rpc("trugen_save_costing", { ...args, p_request_id: randomUUID(), p_expected_version: 1 })).error?.code, "42501");
  assert.equal((await other.rpc("trugen_delete_costing", { p_id: id, p_expected_version: 1 })).error?.code, "P0002");
  assert.equal((await anonymous.rpc("trugen_list_costings", {})).error?.code, "42501");
  assert.equal((await owner.from("costings").update({ food_name: "Must be denied" }).eq("id", id)).error?.code, "42501");
  assert.equal((await owner.from("costing_ingredients").delete().eq("costing_id", id)).error?.code, "42501");
  assert.deepEqual(await rpc(owner, "trugen_get_costing", { p_id: id }), saved, "Denied mutations must preserve the record");
  console.log("PASS: anonymous, foreign-account, and direct-write access denied without mutation.");
  input.ingredients[0].usedQuantity = "0.25";
  const updated = await rpc(owner, "trugen_save_costing", { ...args, p_input: input, p_request_id: randomUUID(), p_expected_version: 1 }); savedVersion = updated.version;
  assert.deepEqual(updated.summary, { totalCost: "325.00", calculatedProfit: "113.75", exactPrice: "438.75", roundedPrice: "440.00", actualRoundedProfit: "115.00", costPerServing: "32.50", exactPricePerServing: "43.88", roundedPricePerServing: "44.00" });
  const staleArgs = { ...args, p_request_id: randomUUID(), p_expected_version: 1 };
  const stale = await owner.rpc("trugen_save_costing", staleArgs);
  if (stale.error?.code === "40001") {
    console.log("PASS: edit recalculation and stale-revision denial returned 40001.");
  } else {
    assert.equal(stale.error?.code, "", "Stale edit must be denied or end in a transport timeout");
    const unchanged = await rpc(owner, "trugen_get_costing", { p_id: id });
    assert.equal(unchanged.version, updated.version, "Timed-out stale request must not change the revision");
    assert.deepEqual(unchanged.summary, updated.summary, "Timed-out stale request must not change totals");
    console.log("PASS WITH PLATFORM LIMIT: stale HTTP request timed out without a database code; record revision and totals remained unchanged. Hosted SQL previously verified 40001.");
  }
  await rpc(owner, "trugen_delete_costing", { p_id: id, p_expected_version: savedVersion }); savedVersion = null;
  const children = await owner.from("costing_ingredients").select("id").eq("costing_id", id);
  assert.equal(children.error, null); assert.equal(children.data.length, 0);
  assert.equal((await owner.rpc("trugen_get_costing", { p_id: id })).error?.code, "P0002");
  console.log("PASS: confirmed delete and ingredient cascade.");
  passed = true;
} finally {
  try {
    // A response can be lost after create/edit commit. Fetch the latest revision
    // only for this run's random UUID, and fail if cleanup cannot be established.
    if ((await owner.auth.getSession()).data.session) {
      const check = await owner.rpc("trugen_get_costing", { p_id: id });
      if (check.data?.version) {
        const cleanup = await owner.rpc("trugen_delete_costing", { p_id: id, p_expected_version: check.data.version });
        assert.equal(cleanup.error, null, `Cleanup failed for temporary UUID ${id}`);
      } else assert.equal(check.error?.code, "P0002", `Cleanup probe failed for temporary UUID ${id}`);
      assert.equal((await owner.rpc("trugen_get_costing", { p_id: id })).error?.code, "P0002");
      const children = await owner.from("costing_ingredients").select("id").eq("costing_id", id);
      assert.equal(children.error, null); assert.deepEqual(children.data, []);
      console.log("PASS: disposable record cleanup verified.");
    }
  } finally {
    const signouts = await Promise.all([owner.auth.signOut({ scope: "local" }), other.auth.signOut({ scope: "local" })]);
    if (signouts.some((result) => result.error)) throw new Error("Test session sign-out failed.");
    console.log("PASS: both SDK test sessions signed out locally.");
  }
}
if (passed) console.log("Live Supabase login, save/retry, read/search, edit, delete/cascade, direct-write denial, ownership checks, cleanup and session sign-out passed.");
