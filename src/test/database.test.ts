// @vitest-environment node
/// <reference types="node" />
// Executes the migration on PGlite/PostgreSQL. Auth identities are local fixtures;
// this does not test Supabase Auth, PostgREST, or a hosted project's configuration.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { calculateCosting } from "../features/costing/calculations";
import { createIngredient } from "../features/costing/types";
import type { CostingInput, SavedCosting } from "../features/costing/costing-repository";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
const input = (): CostingInput => ({ foodName: "Party tray", servings: "10", markup: "35", rounding: "10", ingredients: [{ ...createIngredient("row1"), name: "Chicken", purchasedQuantity: "1", usedQuantity: "0.5", purchasePrice: "1300" }] });
async function asUser(id: string | null) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
}
async function save(value = input(), id: string = randomUUID(), request: string = randomUUID(), version: number | null = null) {
  const result = await db.query<{ record: SavedCosting }>("select public.trugen_save_costing($1::uuid,$2::uuid,$3::integer,$4::jsonb) as record", [id, request, version, JSON.stringify(value)]);
  return result.rows[0].record;
}
async function get(id: string) {
  return (await db.query<{ record: SavedCosting }>("select public.trugen_get_costing($1::uuid) as record", [id])).rows[0].record;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${owner}'), ('${other}');`);
  await db.exec(await readFile(new URL("../../supabase/migrations/202611050001_costings.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../supabase/migrations/202611050002_user_settings.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../supabase/migrations/202611050003_conflict_codes.sql", import.meta.url), "utf8"));
}, 60_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => { await db.exec("reset role; truncate public.costings, public.user_settings cascade;"); await asUser(owner); });

describe("private owner settings", () => {
  async function settings() {
    return (await db.query<{ value: { defaultMarkup: string; rounding: string; updatedAt: string | null } }>("select public.trugen_get_user_settings() as value")).rows[0].value;
  }
  async function saveSettings(markup: string, rounding: string) {
    return (await db.query<{ value: { defaultMarkup: string; rounding: string; updatedAt: string } }>("select public.trugen_save_user_settings($1,$2) as value", [markup, rounding])).rows[0].value;
  }

  it("returns approved defaults without creating a row and persists valid owner preferences", async () => {
    expect(await settings()).toEqual({ defaultMarkup: "35", rounding: "none", updatedAt: null });
    expect((await db.query("select owner_id from public.user_settings")).rows).toHaveLength(0);
    expect(await saveSettings("42.50", "5")).toMatchObject({ defaultMarkup: "42.50", rounding: "5" });
    expect(await settings()).toMatchObject({ defaultMarkup: "42.50", rounding: "5" });
    expect((await db.query("select owner_id from public.user_settings")).rows).toEqual([{ owner_id: owner }]);
  });

  it("isolates account settings and denies direct or anonymous changes", async () => {
    await saveSettings("47.25", "10");
    await asUser(other);
    expect(await settings()).toEqual({ defaultMarkup: "35", rounding: "none", updatedAt: null });
    expect((await db.query("select * from public.user_settings")).rows).toEqual([]);
    await saveSettings("12", "5");
    expect(await settings()).toMatchObject({ defaultMarkup: "12", rounding: "5" });
    await asUser(owner); expect(await settings()).toMatchObject({ defaultMarkup: "47.25", rounding: "10" });
    for (const sql of ["insert into public.user_settings(owner_id) values (auth.uid())", "update public.user_settings set rounding_step='none'", "delete from public.user_settings"]) {
      await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
    }
    await db.exec("reset role; set role anon;");
    await expect(db.exec("select * from public.user_settings")).rejects.toThrow(/permission denied/);
    await expect(db.exec("select public.trugen_get_user_settings()")) .rejects.toThrow(/permission denied/);
    await expect(db.exec("select public.trugen_save_user_settings('35','none')")) .rejects.toThrow(/permission denied/);
  });

  it.each([["-1", "none"], ["35.001", "none"], ["NaN", "none"], ["35", "1"]])("rejects invalid settings %s/%s without changing the saved row", async (markup, rounding) => {
    await saveSettings("35", "none");
    await expect(saveSettings(markup, rounding)).rejects.toThrow();
    expect(await settings()).toMatchObject({ defaultMarkup: "35", rounding: "none" });
  });
});

describe("actual SQL calculations and transactions", () => {
  it("saves, lists, and retrieves the approved example with string precision", async () => {
    const saved = await save();
    expect(saved.summary).toEqual({ totalCost: "650.00", calculatedProfit: "227.50", exactPrice: "877.50", roundedPrice: "880.00", actualRoundedProfit: "230.00", costPerServing: "65.00", exactPricePerServing: "87.75", roundedPricePerServing: "88.00" });
    expect(saved.servings).toBe("10");
    expect(saved.ingredients[0].purchasePrice).toBe("1300.00");
    expect(await get(saved.id)).toEqual(saved);
    const listed = await db.query<{ items: SavedCosting[] }>("select public.trugen_list_costings('PARTY',0) as items");
    expect(listed.rows[0].items[0].id).toBe(saved.id);
  });
  it("returns the same record for retries, rejects changed request reuse, and prevents duplicate creation", async () => {
    const id = randomUUID(), request = randomUUID();
    const saved = await save(input(), id, request);
    expect(await save(input(), id, request)).toEqual(saved);
    await expect(save({ ...input(), foodName: "Changed" }, id, request)).rejects.toThrow(/reused/);
    await expect(save(input(), id)).rejects.toThrow(/changed elsewhere/);
    expect((await db.query("select id from public.costings")).rows).toHaveLength(1);
  });
  it("updates a complete costing atomically and rejects stale revisions", async () => {
    const saved = await save();
    const edited = input(); edited.markup = "50"; edited.ingredients.push({ ...edited.ingredients[0], id: "row2", name: "Rice", purchasePrice: "100" });
    const updated = await save(edited, saved.id, randomUUID(), saved.version);
    expect(updated.summary.exactPrice).toBe("1050.00");
    expect(updated.version).toBe(2); expect(updated.ingredients).toHaveLength(2);
    expect(updated.createdAt).toBe(saved.createdAt); expect(updated.updatedAt).not.toBe(saved.updatedAt);
    await expect(save(input(), saved.id, randomUUID(), 1)).rejects.toMatchObject({ code: "PT409" });
    expect(await get(saved.id)).toEqual(updated);
  });
  it("rolls back a parent update and child replacement when a late insert fails", async () => {
    const saved = await save();
    await db.exec(`reset role; create function public.test_abort_child() returns trigger language plpgsql as $$ begin if new.ingredient_name = 'Late failure' then raise exception 'Injected insert failure'; end if; return new; end $$;
      create trigger test_abort_child before insert on public.costing_ingredients for each row execute function public.test_abort_child();`);
    await asUser(owner);
    try {
      const changed = input(); changed.foodName = "Must roll back"; changed.ingredients[0].name = "Late failure";
      await expect(save(changed, saved.id, randomUUID(), 1)).rejects.toThrow(/Injected insert failure/);
      expect(await get(saved.id)).toEqual(saved);
    } finally { await db.exec("reset role; drop trigger test_abort_child on public.costing_ingredients; drop function public.test_abort_child();"); }
  });
  it("deletes only the expected revision and cascades all ingredients", async () => {
    const saved = await save();
    await expect(db.query("select public.trugen_delete_costing($1,2)", [saved.id])).rejects.toMatchObject({ code: "PT409" });
    expect(await get(saved.id)).toEqual(saved);
    expect((await db.query("select public.trugen_delete_costing($1,1) as deleted", [saved.id])).rows).toEqual([{ deleted: true }]);
    expect((await db.query("select id from public.costing_ingredients")).rows).toHaveLength(0);
    await expect(get(saved.id)).rejects.toThrow(/not found/);
  });
  it("searches literal percent/underscore names and orders by newest creation", async () => {
    await save({ ...input(), foodName: "First" });
    const second = await save({ ...input(), foodName: "50%_Tray" });
    const result = await db.query<{ items: SavedCosting[] }>("select public.trugen_list_costings('',0) as items");
    expect(result.rows[0].items[0].id).toBe(second.id);
    const match = await db.query<{ items: SavedCosting[] }>("select public.trugen_list_costings('%_',0) as items");
    expect(match.rows[0].items.map((item) => item.id)).toEqual([second.id]);
  });
  it.each([
    ["kg", "g", "1", "500", "120", "35", "60.00"],
    ["g", "kg", "500", "0.2", "90", "12.34", "36.00"],
    ["L", "mL", "1", "250", "80", "150", "20.00"],
    ["mL", "L", "500", "0.2", "90", "0", "36.00"],
    ["pcs", "pcs", "1", "0.5", "0.01", "25", "0.01"],
    ["pcs", "pcs", "2.000001", "1", "0.01", "35", "0.00"],
    ["pcs", "pcs", "1", "1", "0", "35", "0.00"],
  ])("agrees with the client for %s/%s quantities %s/%s", async (pu, uu, purchased, used, price, markup, cost) => {
    const value = input(); value.markup = markup; value.servings = "3"; value.rounding = "5";
    Object.assign(value.ingredients[0], { purchaseUnit: pu, usageUnit: uu, purchasedQuantity: purchased, usedQuantity: used, purchasePrice: price });
    const saved = await save(value);
    expect(saved.summary.totalCost).toBe(cost);
    const computed = calculateCosting(value.ingredients, markup, "3", "5");
    for (const key of Object.keys(saved.summary) as (keyof SavedCosting["summary"])[]) expect(saved.summary[key]).toEqual(computed[key]);
  });
  it("sums rounded lines before half-up profit and handles rounding off", async () => {
    const value = input(); value.rounding = "none"; value.markup = "25"; value.servings = "4";
    value.ingredients[0].purchasePrice = "0.01"; value.ingredients.push({ ...value.ingredients[0], id: "two" });
    expect((await save(value)).summary).toMatchObject({ totalCost: "0.02", calculatedProfit: "0.01", exactPrice: "0.03", roundedPrice: null, exactPricePerServing: "0.01" });
  });
  it("retains huge centavo values without JavaScript Number conversion", async () => {
    const value = input(); value.markup = "0"; value.rounding = "none";
    value.ingredients[0].purchasePrice = "9".repeat(80) + ".99"; value.ingredients[0].usedQuantity = "1";
    expect((await save(value)).summary.exactPrice).toBe(value.ingredients[0].purchasePrice);
  });
  it.each([
    ["purchasedQuantity", "0"], ["purchasedQuantity", "-1"], ["purchasedQuantity", "1.0000001"],
    ["usedQuantity", "2"], ["usedQuantity", "0.1234567"], ["purchasePrice", "-1"],
    ["purchasePrice", "10.001"], ["purchasePrice", "NaN"], ["purchasePrice", "Infinity"], ["purchasePrice", "1e2"],
    ["name", " "], ["usageUnit", "L"], ["purchaseUnit", "bag"],
  ])("rejects invalid ingredient %s=%s without creating a record", async (field, value) => {
    const draft = input(); Object.assign(draft.ingredients[0], { [field]: value });
    await expect(save(draft)).rejects.toThrow();
    expect((await db.query("select id from public.costings")).rows).toHaveLength(0);
  });
  it.each([{ foodName: "" }, { servings: "0" }, { servings: "1.5" }, { markup: "35.001" }, { ingredients: [] }])("rejects invalid order fields %j", async (changes) => {
    await expect(save({ ...input(), ...changes })).rejects.toThrow();
  });
});

describe("SQL privileges, RLS and ownership", () => {
  it("prevents deleting an owner account from silently erasing costing history", async () => {
    const saved = await save();
    await db.exec("reset role;");
    await expect(db.query("delete from auth.users where id = $1::uuid", [owner])).rejects.toThrow(/foreign key constraint/);
    await asUser(owner); expect(await get(saved.id)).toEqual(saved);
  });
  it("hides another owner's parent and children and denies all foreign RPC mutations", async () => {
    const saved = await save();
    await asUser(other);
    expect((await db.query("select * from public.costings")).rows).toEqual([]);
    expect((await db.query("select * from public.costing_ingredients")).rows).toEqual([]);
    expect((await db.query("select public.trugen_list_costings() as records")).rows).toEqual([{ records: [] }]);
    await expect(get(saved.id)).rejects.toThrow(/unavailable/);
    await expect(save(input(), saved.id, randomUUID(), 1)).rejects.toThrow(/unavailable/);
    await expect(db.query("select public.trugen_delete_costing($1,1)", [saved.id])).rejects.toThrow(/unavailable/);
    await asUser(owner); expect(await get(saved.id)).toEqual(saved);
  });
  it("denies direct INSERT UPDATE DELETE even to the record owner", async () => {
    const saved = await save();
    for (const sql of [
      "insert into public.costings(id) values (gen_random_uuid())",
      "update public.costings set total_cost_centavos = 0", "delete from public.costings",
      "insert into public.costing_ingredients(costing_id) values (gen_random_uuid())",
      "update public.costing_ingredients set used_qty = 999", "delete from public.costing_ingredients",
      "select trugen_private.document(gen_random_uuid())",
    ]) await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
    expect(await get(saved.id)).toEqual(saved);
  });
  it("denies anonymous reads and RPCs, and authenticated calls with no identity", async () => {
    await save(); await db.exec("reset role; set role anon;");
    for (const sql of ["select * from public.costings", "select * from public.costing_ingredients", "select public.trugen_list_costings()", "select public.trugen_get_costing(gen_random_uuid())", "select public.trugen_delete_costing(gen_random_uuid(),1)", "select public.trugen_save_costing(gen_random_uuid(),gen_random_uuid(),null,'{}')"]) await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
    await asUser(null);
    expect((await db.query("select id from public.costings")).rows).toEqual([]);
    await expect(save()).rejects.toThrow(/Sign in/);
  });
  it("ignores supplied owner IDs and calculated totals and recomputes the authorized result", async () => {
    const draft = { ...input(), owner_id: other, totalCost: "0.00", summary: { exactPrice: "0.00" } };
    const saved = await save(draft);
    expect(saved.summary.exactPrice).toBe("877.50");
    expect((await db.query("select owner_id from public.costings")).rows).toEqual([{ owner_id: owner }]);
  });
});
