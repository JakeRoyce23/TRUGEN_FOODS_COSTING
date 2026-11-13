import { expect, test } from "./fixtures";

test("login and core navigation work with mocked Supabase", async ({ page, api }) => {
  await api.signedOut();
  await page.getByLabel("Email address").fill("owner@trugenfoods.ph");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Magandang araw!" })).toBeVisible();
  await page.getByRole("link", { name: "New Costing" }).first().click();
  await expect(page.getByRole("heading", { name: "Build your food costing" })).toBeVisible();
  await page.getByRole("button", { name: "Add Ingredient" }).click();
  await expect(page.getByTestId("ingredient-card")).toHaveCount(2);
});

test("mock history can be searched without deleting records", async ({ page }) => {
  await page.goto("/history");
  await page.getByLabel("Search saved costings").fill("caldereta");
  await expect(page.getByRole("heading", { name: "Beef Caldereta Party Tray" })).toBeVisible();
  await page.getByLabel("Search saved costings").fill("not a real order");
  await expect(page.getByRole("heading", { name: "No matching costings" })).toBeVisible();
});

test("owner settings persist and initialize only new costings", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByLabel("Default Tubo / markup (%)").fill("42.5");
  await page.getByLabel("Default selling price rounding").selectOption("10");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved. New costings will start with these defaults.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Default Tubo / markup (%)")).toHaveValue("42.5");
  await expect(page.getByLabel("Default selling price rounding")).toHaveValue("10");
  await page.goto("/new");
  await expect(page.getByLabel("Tubo / markup (%)")).toHaveValue("42.5");
  await expect(page.getByLabel("Optional price rounding")).toHaveValue("10");
});
