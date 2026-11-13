import { vi } from "vitest";
import { getOwnerSettings, parseOwnerSettings, saveOwnerSettings, validateOwnerSettings } from "./settings-repository";

const { rpc, signOut } = vi.hoisted(() => ({ rpc: vi.fn(), signOut: vi.fn() }));
vi.mock("../../lib/supabase", () => ({ requireSupabase: () => ({ rpc, auth: { signOut } }) }));

beforeEach(() => { rpc.mockReset(); signOut.mockReset(); });

it("accepts approved markup precision and rounding values", () => {
  expect(validateOwnerSettings("0", "none")).toEqual({ markup: undefined, rounding: undefined });
  expect(validateOwnerSettings("150.25", "10")).toEqual({ markup: undefined, rounding: undefined });
  expect(validateOwnerSettings("35.001", "5").markup).toMatch(/2 decimal/);
  expect(validateOwnerSettings("-1", "none").markup).toMatch(/zero or a positive/);
});

it("parses only validated decimal-string settings", () => {
  expect(parseOwnerSettings({ defaultMarkup: "35", rounding: "none", updatedAt: null })).toEqual({ defaultMarkup: "35", rounding: "none", updatedAt: null });
  expect(() => parseOwnerSettings({ defaultMarkup: 35, rounding: "none", updatedAt: null })).toThrow(/unexpected format/);
  expect(() => parseOwnerSettings({ defaultMarkup: "35.001", rounding: "none", updatedAt: null })).toThrow(/unexpected format/);
  expect(() => parseOwnerSettings({ defaultMarkup: "35", rounding: "1", updatedAt: null })).toThrow(/unexpected format/);
});

it("loads and saves through the authenticated RPCs", async () => {
  rpc.mockResolvedValueOnce({ data: { defaultMarkup: "35", rounding: "none", updatedAt: null }, error: null, status: 200 });
  await expect(getOwnerSettings()).resolves.toMatchObject({ defaultMarkup: "35", rounding: "none" });
  expect(rpc).toHaveBeenLastCalledWith("trugen_get_user_settings", {});
  rpc.mockResolvedValueOnce({ data: { defaultMarkup: "42.5", rounding: "5", updatedAt: "2026-11-05T10:00:00Z" }, error: null, status: 200 });
  await expect(saveOwnerSettings("42.5", "5")).resolves.toMatchObject({ defaultMarkup: "42.5", rounding: "5" });
  expect(rpc).toHaveBeenLastCalledWith("trugen_save_user_settings", { p_default_markup: "42.5", p_rounding: "5" });
});

it("rejects invalid settings before an RPC and safely maps failures", async () => {
  await expect(saveOwnerSettings("35.001", "none")).rejects.toThrow(/2 decimal/);
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValueOnce({ data: null, error: { code: "22023" }, status: 400 });
  await expect(getOwnerSettings()).rejects.toThrow(/Review the markup/);
  rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST301" }, status: 401 });
  await expect(getOwnerSettings()).rejects.toThrow(/session expired/);
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});
