import { requireSupabase } from "../../lib/supabase";
import { calculateCosting } from "./calculations";
import { units, type CostingResult, type IngredientDraft, type RoundingStep } from "./types";

export type CostingInput = { foodName: string; servings: string; markup: string; rounding: RoundingStep; ingredients: IngredientDraft[] };
export type SavedCosting = CostingInput & { id: string; version: number; createdAt: string; updatedAt: string; summary: CostingResult };
export class SessionExpiredError extends Error {}
export class CostingConflictError extends Error {}
const amounts = ["totalCost", "calculatedProfit", "exactPrice", "roundedPrice", "actualRoundedProfit", "costPerServing", "exactPricePerServing", "roundedPricePerServing"] as const;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function parseSavedCosting(value: unknown): SavedCosting {
  const invalid = () => new Error("The saved record has an unexpected format or inconsistent amounts. Please contact the project administrator.");
  if (!object(value) || !["id", "foodName", "servings", "markup", "rounding", "createdAt", "updatedAt"].every((key) => typeof value[key] === "string")
    || !Number.isSafeInteger(value.version) || Number(value.version) < 1 || !Array.isArray(value.ingredients) || !object(value.summary)) throw invalid();
  const ingredients: IngredientDraft[] = value.ingredients.map((item: unknown) => {
    if (!object(item) || !["id", "name", "purchasedQuantity", "purchaseUnit", "purchasePrice", "usedQuantity", "usageUnit"].every((key) => typeof item[key] === "string")
      || !units.includes(item.purchaseUnit as typeof units[number]) || !units.includes(item.usageUnit as typeof units[number])) throw invalid();
    return { id: item.id as string, name: item.name as string, purchasedQuantity: item.purchasedQuantity as string, purchaseUnit: item.purchaseUnit as typeof units[number], purchasePrice: item.purchasePrice as string, usedQuantity: item.usedQuantity as string, usageUnit: item.usageUnit as typeof units[number] };
  });
  const input = { foodName: value.foodName as string, servings: value.servings as string, markup: value.markup as string, rounding: value.rounding as RoundingStep, ingredients };
  const computed = calculateCosting(ingredients, input.markup, input.servings, input.rounding);
  const summary = value.summary;
  if (!input.foodName.trim() || computed.isPartial || Object.keys(computed.errors).length || amounts.some((key) => summary[key] !== computed[key])
    || !Number.isFinite(Date.parse(value.createdAt as string)) || !Number.isFinite(Date.parse(value.updatedAt as string))) throw invalid();
  for (let i = 0; i < ingredients.length; i++) {
    if ((value.ingredients[i] as Record<string, unknown>).cost !== computed.ingredients[i].cost) throw invalid();
  }
  return { ...input, id: value.id as string, version: value.version as number, createdAt: value.createdAt as string, updatedAt: value.updatedAt as string, summary: computed };
}

async function rpc(name: string, args: Record<string, unknown>) {
  const client = requireSupabase();
  const { data, error, status } = await client.rpc(name, args);
  if (error) {
    if (status === 401 || error.code === "PGRST301") {
      await client.auth.signOut({ scope: "local" });
      throw new SessionExpiredError("Your session expired. Please sign in again.");
    }
    if (error.code === "PT409" || error.code === "40001") throw new CostingConflictError("This costing was modified elsewhere. Reload the latest saved version before making more changes. Your unsaved entries are still here until you reload.");
    if (error.code === "P0002" || error.code === "42501") throw new Error("This costing is unavailable or you do not have access to it.");
    if (error.code === "22023") throw new Error("The database rejected these entries. Review the fields and try again.");
    throw new Error("Could not confirm the database operation. Check your connection and try again. For saving, retry unchanged entries to safely confirm the same request.");
  }
  return data as unknown;
}

export async function listCostings(search = "", offset = 0): Promise<SavedCosting[]> {
  const data = await rpc("trugen_list_costings", { p_search: search, p_offset: offset });
  if (!Array.isArray(data)) throw new Error("Unexpected history response. Please try again.");
  return data.map(parseSavedCosting);
}
export async function getCosting(id: string) {
  return parseSavedCosting(await rpc("trugen_get_costing", { p_id: id }));
}
export async function saveCosting(id: string, requestId: string, version: number | null, input: CostingInput) {
  const result = calculateCosting(input.ingredients, input.markup, input.servings, input.rounding);
  if (!input.foodName.trim() || result.isPartial || Object.keys(result.errors).length) throw new Error("Complete all fields before saving.");
  return parseSavedCosting(await rpc("trugen_save_costing", { p_id: id, p_request_id: requestId, p_expected_version: version, p_input: input }));
}
export async function deleteCosting(id: string, version: number) {
  const data = await rpc("trugen_delete_costing", { p_id: id, p_expected_version: version });
  if (data !== true) throw new Error("Deletion was not confirmed. Reload history before trying again.");
}

export const formatSavedDate = (iso: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(iso));
