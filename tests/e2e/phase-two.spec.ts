import { expect, test, type Locator, type Page } from "./fixtures";

async function fillIngredient(card: Locator, values: { name: string; purchased: string; price: string; used: string; purchaseUnit?: string; usageUnit?: string }) {
  await card.getByLabel("Ingredient name").fill(values.name);
  await card.getByLabel("Purchased quantity").fill(values.purchased);
  await card.getByLabel("Purchase price (₱)").fill(values.price);
  await card.getByLabel("Actual quantity used").fill(values.used);
  if (values.purchaseUnit) await card.getByLabel("Purchase unit", { exact: true }).selectOption(values.purchaseUnit);
  if (values.usageUnit) await card.getByLabel("Usage unit", { exact: true }).selectOption(values.usageUnit);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("approved example preserves exact and rounded amounts and updates without submission", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/new");
  await expect(page.getByLabel("Tubo / markup (%)")).toHaveValue("35");
  await expect(page.getByLabel("Optional price rounding")).toHaveValue("none");
  await expect(page.getByTestId("total-cost")).toHaveText("—");
  await page.getByLabel("Food / order name").fill("Party tray — verification");
  await page.getByLabel("Number of servings").fill("10");
  await fillIngredient(page.getByTestId("ingredient-card"), { name: "Ingredient purchase", purchased: "1", price: "1300", used: "0.5" });
  await page.getByLabel("Optional price rounding").selectOption("10");

  for (const [id, expected] of Object.entries({
    "total-cost": "₱650.00", "calculated-profit": "₱227.50", "exact-price": "₱877.50",
    "cost-per-serving": "₱65.00", "exact-per-serving": "₱87.75", "rounded-price": "₱880.00",
    "rounded-per-serving": "₱88.00", "rounded-profit": "₱230.00",
  })) await expect(page.getByTestId(id)).toHaveText(expected);

  await page.getByRole("button", { name: "Review costing", exact: true }).click();
  await expect(page.getByText("All entries are valid. Your costing is calculated but has not been saved.")).toBeVisible();
  await expectNoOverflow(page);
  if (testInfo.project.name === "desktop-chrome") {
    await page.getByRole("heading", { name: "Build your food costing", exact: true }).scrollIntoViewIfNeeded();
  } else {
    await page.getByRole("region", { name: "Costing summary", exact: true }).scrollIntoViewIfNeeded();
  }
  await page.screenshot({ path: testInfo.outputPath("phase2-regression.png"), fullPage: testInfo.project.name === "desktop-chrome" });

  await page.getByLabel("Tubo / markup (%)").fill("150");
  await expect(page.getByTestId("calculated-profit")).toHaveText("₱975.00");
  await page.getByLabel("Optional price rounding").selectOption("none");
  await expect(page.getByTestId("rounded-price")).toHaveCount(0);
  await expect(page.getByTestId("exact-price")).toHaveText("₱1,625.00");
  await page.getByLabel("Number of servings").fill("0");
  await expect(page.getByLabel("Number of servings")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("exact-per-serving")).toHaveText("—");
  await expect(page.getByTestId("exact-price")).toHaveText("₱1,625.00");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Tubo / markup (%)")).toHaveValue("35");
  await expect(page.getByTestId("total-cost")).toHaveText("—");
  expect(errors).toEqual([]);
});

test("units, partial totals, precision feedback, and removal remain usable", async ({ page }) => {
  await page.goto("/new");
  await fillIngredient(page.getByTestId("ingredient-card"), { name: "Carrots", purchased: "500", purchaseUnit: "g", price: "90", used: "0.2", usageUnit: "kg" });
  await expect(page.getByTestId("ingredient-cost")).toHaveText("₱36.00");
  await page.getByRole("button", { name: "Add Ingredient", exact: true }).click();
  const cards = page.getByTestId("ingredient-card");
  await expect(cards).toHaveCount(2);
  await expect(page.getByText(/Partial estimate: 1 of 2/)).toBeVisible();
  await fillIngredient(cards.nth(1), { name: "Milk", purchased: "1", purchaseUnit: "L", price: "80", used: "250", usageUnit: "mL" });
  await expect(page.getByTestId("total-cost")).toHaveText("₱56.00");
  await cards.nth(1).getByLabel("Usage unit").selectOption("kg");
  await expect(cards.nth(1).getByText("Choose compatible units: kg/g, L/mL, or pcs/pcs.")).toBeVisible();
  await expect(page.getByTestId("total-cost")).toHaveText("₱36.00");
  await cards.nth(1).getByLabel("Usage unit").selectOption("mL");
  await cards.nth(1).getByLabel("Actual quantity used").fill("1000.000001");
  await expect(cards.nth(1).getByText(/Usage cannot exceed the purchased quantity/)).toBeVisible();
  await cards.nth(1).getByLabel("Actual quantity used").fill("0.1234567");
  await expect(cards.nth(1).getByText("Use at most 6 decimal places.")).toBeVisible();
  await cards.nth(1).getByLabel("Actual quantity used").fill("250");
  await cards.nth(1).getByLabel("Purchase price (₱)").fill("80.001");
  await expect(cards.nth(1).getByText("Use at most 2 decimal places.")).toBeVisible();
  await cards.nth(1).getByLabel("Purchase price (₱)").fill("0");
  await expect(cards.nth(1).getByTestId("ingredient-cost")).toHaveText("₱0.00");
  await expect(page.getByText(/Partial estimate/)).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove ingredient 1", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.getByLabel("Ingredient name")).toHaveValue("Milk");
  await expect(page.getByTestId("total-cost")).toHaveText("₱0.00");
  await fillIngredient(cards, { name: "Egg", purchased: "1", purchaseUnit: "pcs", price: "10", used: "0.5", usageUnit: "pcs" });
  await expect(page.getByTestId("total-cost")).toHaveText("₱5.00");
  await cards.getByLabel("Purchase price (₱)").fill("");
  await expect(page.getByTestId("total-cost")).toHaveText("—");
  await expectNoOverflow(page);
});

test("all Phase 1 routes still render without horizontal overflow or runtime errors", async ({ page, api }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, heading] of [["/", "Magandang araw!"], ["/new", "Build your food costing"], ["/history", "Costing history"], ["/settings", "Settings"], ["/login", "Welcome back"]]) {
    if (path === "/login") await api.signedOut();
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expectNoOverflow(page);
  }
  expect(errors).toEqual([]);
});
