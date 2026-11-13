import { expect, test, type Page } from "./fixtures";

async function fillCosting(page: Page) {
  await page.goto("/new");
  await page.getByLabel("Food / order name").fill("Phase 4 saved tray");
  await page.getByLabel("Number of servings").fill("10");
  await page.getByLabel("Ingredient name").fill("Chicken");
  await page.getByLabel("Purchased quantity").fill("1");
  await page.getByLabel("Purchase price (₱)").fill("1300");
  await page.getByLabel("Actual quantity used").fill("0.5");
  await page.getByLabel("Optional price rounding").selectOption("10");
}

test("mocked auth rejects wrong credentials, protects routes, restores sessions, and logs out", async ({ page, api }) => {
  await api.signedOut();
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill("owner@trugenfoods.ph");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect. Please try again.");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Costing history", exact: true })).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Log out", exact: true }).last().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/new");
  await expect(page).toHaveURL(/\/login$/);
});

test("a rejected expired session returns the user to login", async ({ page, api }) => {
  await api.expireSession();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("mocked database saves, retrieves, edits, recalculates, and deletes a costing", async ({ page, api }, testInfo) => {
  await fillCosting(page);
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("exact-price")).toHaveText("₱877.50");
  await expect(page.getByTestId("rounded-profit")).toHaveText("₱230.00");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Phase 4 saved tray", exact: true })).toBeVisible();
  await expect(page.getByText("Purchased: 1 kg for ₱1,300.00")).toBeVisible();
  await page.getByRole("link", { name: "Edit costing", exact: true }).click();
  await expect(page.getByLabel("Purchase price (₱)")).toHaveValue("1300");
  await page.getByLabel("Actual quantity used").fill("0.25");
  await expect(page.getByTestId("exact-price")).toHaveText("₱438.75");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("rounded-price")).toHaveText("₱440.00");
  await expect(page.getByTestId("rounded-profit")).toHaveText("₱115.00");
  await page.goto("/history");
  await page.getByLabel("Search saved costings").fill("Phase 4 saved");
  const card = page.getByTestId("saved-costing-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("₱438.75");
  await page.screenshot({ path: `docs/qa/phase4-history-${testInfo.project.name}.png`, fullPage: true });
  page.once("dialog", (dialog) => dialog.dismiss());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(card).toHaveCount(1);
  api.failDelete = true;
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not confirm");
  await expect(card).toHaveCount(1);
  api.failDelete = false;
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Deleted “Phase 4 saved tray”.", { exact: true })).toBeVisible();
  await expect(card).toHaveCount(0);
});

test("failed saves retain entries and uncertain response retries create only one record", async ({ page, api }) => {
  await fillCosting(page);
  api.failSave = true;
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not confirm");
  await expect(page.getByLabel("Food / order name")).toHaveValue("Phase 4 saved tray");
  await expect(page.getByLabel("Purchase price (₱)")).toHaveValue("1300");
  api.failSave = false; api.loseSaveResponse = true;
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not confirm");
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
  expect([...api.records.values()].filter((item) => item.foodName === "Phase 4 saved tray")).toHaveLength(1);
});

test("save locks the form, blocks duplicate clicks, and disallows incomplete records", async ({ page, api }) => {
  await page.goto("/new");
  await expect(page.getByRole("button", { name: "Save costing", exact: true })).toBeDisabled();
  await fillCosting(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/rest/v1/rpc/trugen_save_costing", async (route) => { await gate; await route.fallback(); });
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Food / order name")).toBeDisabled();
  release();
  await expect(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
  expect(api.saveCalls).toBe(1);
});

test("history failures are retryable and unavailable records are handled clearly", async ({ page, api }) => {
  api.failHistory = true;
  await page.goto("/history");
  await expect(page.getByRole("alert")).toContainText("Could not confirm");
  api.failHistory = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByTestId("saved-costing-card")).toHaveCount(1);
  await page.goto("/costings/99999999-9999-4999-8999-999999999999");
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await page.getByRole("link", { name: "Back to history", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Costing history", exact: true })).toBeVisible();
});

test("stale edits preserve local input and explicitly reload the latest saved version", async ({ page, api }) => {
  const [id, current] = [...api.records.entries()][0];
  await page.goto(`/costings/${id}/edit`);
  await expect(page.getByLabel("Food / order name")).toHaveValue(current.foodName);
  api.records.set(id, { ...current, foodName: "Server-side latest version", version: current.version + 1, updatedAt: new Date().toISOString() });
  await page.getByLabel("Food / order name").fill("Unsaved local edit");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("modified elsewhere");
  await expect(page.getByLabel("Food / order name")).toHaveValue("Unsaved local edit");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reload latest version", exact: true }).click();
  await expect(page.getByLabel("Food / order name")).toHaveValue("Unsaved local edit");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reload latest version", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Server-side latest version", exact: true })).toBeVisible();
});

test("a failed save survives same-owner reauthentication without exposing it while signed out", async ({ page, api }) => {
  await fillCosting(page); api.expireOnSave = true;
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Food / order name")).toHaveCount(0);
  await page.getByLabel("Email address").fill("owner@trugenfoods.ph");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByLabel("Food / order name")).toHaveValue("Phase 4 saved tray");
  await expect(page.getByLabel("Purchase price (₱)")).toHaveValue("1300");
  await expect(page.getByTestId("exact-price")).toHaveText("₱877.50");
  await page.getByRole("button", { name: "Save costing", exact: true }).click();
  await expect(page.getByText("Costing saved successfully.", { exact: true })).toBeVisible();
});
