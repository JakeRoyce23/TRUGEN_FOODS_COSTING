import { expect, test as base, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { calculateCosting } from "../../src/features/costing/calculations";
import { createIngredient } from "../../src/features/costing/types";
import type { CostingInput, SavedCosting } from "../../src/features/costing/costing-repository";

export { expect };
export type { Locator, Page } from "@playwright/test";
const owner = { id: "11111111-1111-4111-8111-111111111111", email: "owner@trugenfoods.ph", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" };
const storageKey = "sb-supabase-auth-token";
function session(expired = false) {
  const exp = Math.floor(Date.now() / 1000) + (expired ? -10 : 3600);
  const jwt = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner.id, exp, role: "authenticated", aud: "authenticated" })).toString("base64url")}.test-signature`;
  return { access_token: jwt, refresh_token: "test-refresh-token", token_type: "bearer", expires_at: exp, expires_in: 3600, user: owner };
}
function record(input: CostingInput, id: string, version = 1, createdAt?: string): SavedCosting {
  const summary = calculateCosting(input.ingredients, input.markup, input.servings, input.rounding);
  return { ...input, id, version, createdAt: createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(),
    ingredients: input.ingredients.map((item, index) => ({ ...item, cost: summary.ingredients[index].cost })), summary };
}

/** Network mocks only. SQL security is tested separately in database.test.ts. */
export class MockApi {
  records = new Map<string, SavedCosting>();
  requests = new Map<string, { signature: string; saved: SavedCosting }>();
  settings: { defaultMarkup: string; rounding: "none" | "5" | "10"; updatedAt: string | null } = { defaultMarkup: "35", rounding: "none", updatedAt: null };
  saveCalls = 0;
  failHistory = false;
  failSave = false;
  loseSaveResponse = false;
  failDelete = false;
  expireRefresh = false;
  expireOnSave = false;
  constructor(private page: Page) {
    const draft: CostingInput = { foodName: "Beef Caldereta Party Tray", servings: "10", markup: "35", rounding: "10", ingredients: [{ ...createIngredient("mock-row"), name: "Beef", purchasedQuantity: "1", usedQuantity: "0.5", purchasePrice: "1300" }] };
    const saved = record(draft, randomUUID()); this.records.set(saved.id, saved);
  }
  async signedOut() {
    await this.page.evaluate((key) => localStorage.removeItem(key), storageKey);
    await this.page.goto("/login");
  }
  async expireSession() {
    this.expireRefresh = true;
    await this.page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: storageKey, data: session(true) });
    await this.page.reload();
  }
  async install() {
    await this.page.addInitScript(({ key, data }) => {
      if (!sessionStorage.getItem("trugen-test-seeded")) {
        localStorage.setItem(key, JSON.stringify(data)); sessionStorage.setItem("trugen-test-seeded", "true");
      }
    }, { key: storageKey, data: session() });
    await this.page.route("https://supabase.test/**", async (route) => {
      const request = route.request(); const url = new URL(request.url());
      const ok = (data: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
      const error = (status: number, code: string, message: string) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ code, error_code: code, message, msg: message }) });
      if (request.method() === "OPTIONS") return ok({});
      if (url.pathname.endsWith("/token")) {
        if (url.searchParams.get("grant_type") === "refresh_token") return this.expireRefresh ? error(400, "refresh_token_not_found", "Refresh token not found") : ok(session());
        const credentials = request.postDataJSON();
        return credentials.email === owner.email && credentials.password === "correct-password" ? ok(session()) : error(400, "invalid_credentials", "Invalid login credentials");
      }
      if (url.pathname.endsWith("/user")) return ok(owner);
      if (url.pathname.endsWith("/logout")) return ok({});
      const args = request.postDataJSON();
      if (url.pathname.endsWith("/trugen_get_user_settings")) return ok(this.settings);
      if (url.pathname.endsWith("/trugen_save_user_settings")) {
        this.settings = { defaultMarkup: args.p_default_markup, rounding: args.p_rounding, updatedAt: new Date().toISOString() };
        return ok(this.settings);
      }
      if (url.pathname.endsWith("/trugen_list_costings")) {
        if (this.failHistory) return error(503, "unavailable", "Unavailable");
        return ok([...this.records.values()].filter((item) => item.foodName.toLowerCase().includes(args.p_search.trim().toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(args.p_offset, args.p_offset + 50));
      }
      if (url.pathname.endsWith("/trugen_get_costing")) return this.records.has(args.p_id) ? ok(this.records.get(args.p_id)) : error(404, "P0002", "Unavailable");
      if (url.pathname.endsWith("/trugen_delete_costing")) {
        if (this.failDelete) return error(503, "unavailable", "Unavailable");
        const current = this.records.get(args.p_id);
        if (!current) return error(404, "P0002", "Unavailable");
        if (current.version !== args.p_expected_version) return error(409, "PT409", "Conflict");
        this.records.delete(args.p_id); return ok(true);
      }
      if (url.pathname.endsWith("/trugen_save_costing")) {
        this.saveCalls++;
        if (this.expireOnSave) { this.expireOnSave = false; return error(401, "PGRST301", "JWT expired"); }
        if (this.failSave) return error(503, "unavailable", "Unavailable");
        const prior = this.requests.get(args.p_request_id);
        const signature = JSON.stringify(args.p_input);
        if (prior) return prior.signature === signature ? ok(prior.saved) : error(400, "22023", "Changed request");
        const current = this.records.get(args.p_id);
        if (current && current.version !== args.p_expected_version) return error(409, "PT409", "Conflict");
        const saved = record(args.p_input, args.p_id, current ? current.version + 1 : 1, current?.createdAt);
        this.records.set(saved.id, saved); this.requests.set(args.p_request_id, { signature, saved });
        if (this.loseSaveResponse) { this.loseSaveResponse = false; return route.abort("failed"); }
        return ok(saved);
      }
      return error(404, "not_found", "Unexpected test endpoint");
    });
  }
}

export const test = base.extend<{ api: MockApi }>({
  api: [async ({ page }, use) => {
    const api = new MockApi(page); await api.install(); await page.goto("/");
    await expect(page.getByRole("heading", { name: "Magandang araw!", exact: true })).toBeVisible();
    await use(api);
  }, { auto: true }],
});
