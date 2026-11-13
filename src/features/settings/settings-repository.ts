import { requireSupabase } from "../../lib/supabase";
import { calculateCosting } from "../costing/calculations";
import { DEFAULT_MARKUP, DEFAULT_ROUNDING, type RoundingStep } from "../costing/types";

export type OwnerSettings = {
  defaultMarkup: string;
  rounding: RoundingStep;
  updatedAt: string | null;
};

export const DEFAULT_OWNER_SETTINGS: OwnerSettings = {
  defaultMarkup: DEFAULT_MARKUP,
  rounding: DEFAULT_ROUNDING,
  updatedAt: null,
};

export function validateOwnerSettings(defaultMarkup: string, rounding: string) {
  const result = calculateCosting([], defaultMarkup, "1", rounding);
  return { markup: result.errors.markup, rounding: result.errors.rounding };
}

export function parseOwnerSettings(value: unknown): OwnerSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The saved settings have an unexpected format. Please try again.");
  const record = value as Record<string, unknown>;
  if (typeof record.defaultMarkup !== "string" || !["none", "5", "10"].includes(String(record.rounding))
    || !(record.updatedAt === null || (typeof record.updatedAt === "string" && !Number.isNaN(Date.parse(record.updatedAt))))) {
    throw new Error("The saved settings have an unexpected format. Please try again.");
  }
  const validation = validateOwnerSettings(record.defaultMarkup, String(record.rounding));
  if (validation.markup || validation.rounding) throw new Error("The saved settings have an unexpected format. Please try again.");
  return { defaultMarkup: record.defaultMarkup, rounding: record.rounding as RoundingStep, updatedAt: record.updatedAt as string | null };
}

async function settingsRpc(name: string, parameters: Record<string, unknown> = {}) {
  const client = requireSupabase();
  const { data, error, status } = await client.rpc(name, parameters);
  if (error || status < 200 || status >= 300) {
    if (status === 401 || error?.code === "PGRST301") {
      await client.auth.signOut({ scope: "local" });
      throw new Error("Your session expired. Please sign in again.");
    }
    if (error?.code === "22023") throw new Error("Review the markup and rounding values, then try again.");
    if (error?.code === "42501") throw new Error("Your account cannot access these settings. Please sign in again.");
    throw new Error("Could not confirm your settings. Check your connection and try again.");
  }
  return data as unknown;
}

export async function getOwnerSettings() {
  return parseOwnerSettings(await settingsRpc("trugen_get_user_settings"));
}

export async function saveOwnerSettings(defaultMarkup: string, rounding: RoundingStep) {
  const validation = validateOwnerSettings(defaultMarkup, rounding);
  if (validation.markup || validation.rounding) throw new Error(validation.markup ?? validation.rounding);
  return parseOwnerSettings(await settingsRpc("trugen_save_user_settings", { p_default_markup: defaultMarkup, p_rounding: rounding }));
}
