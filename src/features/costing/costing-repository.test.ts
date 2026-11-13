import { vi } from "vitest";
import { calculateCosting } from "./calculations";
import { createIngredient } from "./types";
import { CostingConflictError, deleteCosting, parseSavedCosting, saveCosting, type CostingInput } from "./costing-repository";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../../lib/supabase", () => ({ requireSupabase: () => ({ rpc, auth: { signOut: vi.fn() } }) }));
const draft = (): CostingInput => ({ foodName: "Party tray", servings: "10", markup: "35", rounding: "10", ingredients: [{ ...createIngredient("row"), name: "Chicken", purchasedQuantity: "1", usedQuantity: "0.5", purchasePrice: "1300" }] });
function saved() {
  const input = draft(); const summary = calculateCosting(input.ingredients, input.markup, input.servings, input.rounding);
  return { ...input, id: "record", version: 1, createdAt: "2026-11-05T00:00:00Z", updatedAt: "2026-11-05T00:00:00Z", ingredients: input.ingredients.map((item, index) => ({ ...item, cost: summary.ingredients[index].cost })), summary };
}
beforeEach(() => rpc.mockReset());

it("validates retrieved financial strings against the approved calculator", () => {
  expect(parseSavedCosting(saved()).summary.exactPrice).toBe("877.50");
  const wrong = saved(); wrong.summary.exactPrice = "877.49";
  expect(() => parseSavedCosting(wrong)).toThrow(/inconsistent/);
});
it("rejects numeric JSON values rather than accepting lost financial precision", () => {
  const wrong = saved();
  expect(() => parseSavedCosting({ ...wrong, summary: { ...wrong.summary, exactPrice: 877.5 } })).toThrow(/inconsistent/);
  expect(() => parseSavedCosting({ ...wrong, servings: 10 })).toThrow(/unexpected/);
});
it("rejects invalid record dates and line costs", () => {
  expect(() => parseSavedCosting({ ...saved(), createdAt: "bad date" })).toThrow();
  const wrong = saved(); wrong.ingredients[0].cost = "0.00";
  expect(() => parseSavedCosting(wrong)).toThrow();
});
it("does not make an RPC request for incomplete inputs", async () => {
  await expect(saveCosting("id", "request", null, { ...draft(), foodName: " " })).rejects.toThrow(/Complete/);
  expect(rpc).not.toHaveBeenCalled();
});
it("sends input snapshots and request/version identity without client totals", async () => {
  rpc.mockResolvedValue({ data: saved(), error: null, status: 200 });
  await saveCosting("id", "request", 1, draft());
  expect(rpc).toHaveBeenCalledWith("trugen_save_costing", { p_id: "id", p_request_id: "request", p_expected_version: 1, p_input: draft() });
});
it("rejects success claims for RPC errors and exposes conflict recovery", async () => {
  for (const code of ["PT409", "40001"]) {
    rpc.mockResolvedValueOnce({ data: null, error: { code }, status: 409 });
    await expect(saveCosting("id", "request", 1, draft())).rejects.toBeInstanceOf(CostingConflictError);
  }
  rpc.mockResolvedValue({ data: null, error: { code: "503" }, status: 503 });
  await expect(saveCosting("id", "request", 1, draft())).rejects.toThrow(/Could not confirm/);
});
it("maps stale delete responses to the same explicit conflict", async () => {
  rpc.mockResolvedValue({ data: null, error: { code: "PT409" }, status: 409 });
  await expect(deleteCosting("id", 1)).rejects.toBeInstanceOf(CostingConflictError);
});
