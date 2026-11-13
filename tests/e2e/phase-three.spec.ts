import { expect, test, type Locator } from "./fixtures";

async function fillIngredient(card: Locator, name: string, purchased: string, price: string, used: string, purchaseUnit = "kg", usageUnit = "kg") {
  await card.getByLabel("Ingredient name").fill(name);
  await card.getByLabel("Purchased quantity").fill(purchased);
  await card.getByLabel("Purchase price (₱)").fill(price);
  await card.getByLabel("Actual quantity used").fill(used);
  await card.getByLabel("Purchase unit", { exact: true }).selectOption(purchaseUnit);
  await card.getByLabel("Usage unit", { exact: true }).selectOption(usageUnit);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/new");
});

test("results, keyboard focus, and touch targets fit every viewport", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByLabel("Food / order name").fill("Party tray");
  await page.getByLabel("Food / order name").press("Tab");
  await expect(page.getByLabel("Number of servings")).toBeFocused();
  await page.getByLabel("Number of servings").fill("10");
  await fillIngredient(page.getByTestId("ingredient-card"), "Chicken purchase", "1", "1300", "0.5");
  await page.getByLabel("Optional price rounding").selectOption("10");
  await expect(page.getByTestId("selected-markup")).toHaveText("35%");
  await expect(page.getByTestId("costing-readiness")).toHaveText("All entries valid · Not saved");
  for (const [id, expected] of Object.entries({
    "total-cost": "₱650.00", "calculated-profit": "₱227.50", "exact-price": "₱877.50",
    "cost-per-serving": "₱65.00", "exact-per-serving": "₱87.75", "rounded-price": "₱880.00",
    "rounded-per-serving": "₱88.00", "rounded-profit": "₱230.00",
  })) await expect(page.getByTestId(id)).toHaveText(expected);

  await page.getByRole("button", { name: "View results", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Costing summary", exact: true })).toBeFocused();
  const headingBox = await page.getByRole("heading", { name: "Costing summary", exact: true }).boundingBox();
  expect(headingBox!.y).toBeGreaterThanOrEqual(68);
  await page.getByRole("button", { name: "Back to ingredients", exact: true }).click();
  await expect(page.getByLabel("Ingredient name")).toBeFocused();
  await expect(page.getByLabel("Purchased quantity")).toHaveAttribute("inputmode", "decimal");
  await expect(page.getByLabel("Number of servings")).toHaveAttribute("inputmode", "numeric");
  const metrics = await page.locator("form").evaluate((form) => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    smallTargets: [...form.querySelectorAll("button, input, select")].filter((element) => element.getBoundingClientRect().height < 44).length,
    smallInputText: [...form.querySelectorAll("input, select")].filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16).length,
  }));
  expect(metrics).toEqual({ overflow: false, smallTargets: 0, smallInputText: 0 });
  await expect(page.getByRole("button", { name: "Save costing", exact: true })).toBeEnabled();
  await page.getByRole("heading", { name: "Build your food costing", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("phase3-regression.png"), fullPage: true });
  if (testInfo.project.name === "desktop-chrome") {
    await page.getByRole("region", { name: "Costing summary", exact: true }).screenshot({ path: testInfo.outputPath("phase3-results.png") });
  } else {
    await page.getByRole("button", { name: "View results", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath("phase3-results.png") });
  }
  expect(errors).toEqual([]);
});

test("review directs corrections and incomplete order details never look final", async ({ page }) => {
  await page.getByRole("button", { name: "Review costing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Check 6 fields");
  await expect(page.getByLabel("Food / order name")).toBeFocused();
  await expect(page.getByLabel("Purchased quantity")).toHaveAccessibleDescription("This field is required.");
  await page.getByLabel("Food / order name").fill("Rice bowls");
  await page.getByLabel("Number of servings").fill("10");
  await fillIngredient(page.getByTestId("ingredient-card"), "Rice", "1", "100", "0.5");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("costing-readiness")).toContainText("All entries valid");

  for (const [label, value, message] of [
    ["Purchased quantity", "0", "Enter a number greater than zero."],
    ["Purchased quantity", "-1", "Enter a number greater than zero."],
    ["Purchased quantity", "1.0000001", "Use at most 6 decimal places."],
    ["Actual quantity used", "2", "Usage cannot exceed"],
    ["Actual quantity used", "0", "Enter a number greater than zero."],
    ["Purchase price (₱)", "-1", "Enter zero or a positive number."],
    ["Purchase price (₱)", "1.001", "Use at most 2 decimal places."],
    ["Number of servings", "1.5", "Enter a positive whole number."],
    ["Tubo / markup (%)", "-1", "Enter zero or a positive number."],
    ["Tubo / markup (%)", "35.001", "Use at most 2 decimal places."],
  ]) {
    const input = page.getByLabel(label, { exact: true });
    const before = await input.inputValue();
    await input.fill(value);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByTestId("costing-readiness")).toContainText("Incomplete costing");
    await page.getByRole("button", { name: "Review costing", exact: true }).click();
    await expect(input).toBeFocused();
    await input.fill(before);
    await expect(page.getByTestId("costing-readiness")).toContainText("All entries valid");
  }
  await page.getByLabel("Usage unit", { exact: true }).selectOption("L");
  await expect(page.getByLabel("Usage unit", { exact: true })).toHaveAccessibleDescription("Choose compatible units: kg/g, L/mL, or pcs/pcs.");
  await page.getByLabel("Usage unit", { exact: true }).selectOption("kg");
  await page.getByLabel("Food / order name").fill(" ");
  await expect(page.getByTestId("exact-price")).toHaveText("₱67.50");
  await expect(page.getByTestId("costing-readiness")).toContainText("Incomplete costing");
});

test("removal and reset preserve data on cancel and move focus after confirmation", async ({ page }) => {
  await fillIngredient(page.getByTestId("ingredient-card"), "Rice", "1", "100", "1");
  await page.getByRole("button", { name: "Add Ingredient", exact: true }).click();
  const cards = page.getByTestId("ingredient-card");
  await expect(cards.nth(1).getByLabel("Ingredient name")).toBeFocused();
  await fillIngredient(cards.nth(1), "Egg", "1", "10", "0.5", "pcs", "pcs");
  await expect(page.getByTestId("total-cost")).toHaveText("₱105.00");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Remove ingredient 1", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.getByTestId("total-cost")).toHaveText("₱105.00");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove ingredient 1", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(page.getByLabel("Ingredient name")).toHaveValue("Egg");
  await expect(page.getByLabel("Ingredient name")).toBeFocused();
  await expect(page.getByTestId("total-cost")).toHaveText("₱5.00");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByTestId("total-cost")).toHaveText("₱5.00");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Food / order name")).toBeFocused();
  await expect(page.getByTestId("total-cost")).toHaveText("—");
  await expect(page.getByLabel("Tubo / markup (%)")).toHaveValue("35");
  await expect(page.getByLabel("Optional price rounding")).toHaveValue("none");
});

test("a multi-ingredient pancake batch preserves conversions and rounding choices", async ({ page }) => {
  await page.getByLabel("Food / order name").fill("Pancake batch");
  await page.getByLabel("Number of servings").fill("3");
  const cards = page.getByTestId("ingredient-card");
  await fillIngredient(cards.nth(0), "Flour", "1", "80", "250", "kg", "g");
  await page.getByRole("button", { name: "Add Ingredient", exact: true }).click();
  await expect(page.getByText(/Partial estimate: 1 of 2/)).toBeVisible();
  await fillIngredient(cards.nth(1), "Milk", "1", "100", "200", "L", "mL");
  await page.getByRole("button", { name: "Add Ingredient", exact: true }).click();
  await fillIngredient(cards.nth(2), "Egg", "1", "10", "0.5", "pcs", "pcs");
  await page.getByLabel("Tubo / markup (%)").fill("50");
  await page.getByLabel("Optional price rounding").selectOption("5");
  for (const [id, expected] of Object.entries({
    "total-cost": "₱45.00", "calculated-profit": "₱22.50", "exact-price": "₱67.50",
    "cost-per-serving": "₱15.00", "exact-per-serving": "₱22.50", "rounded-price": "₱70.00",
    "rounded-per-serving": "₱23.33", "rounded-profit": "₱25.00",
  })) await expect(page.getByTestId(id)).toHaveText(expected);
  await page.getByLabel("Optional price rounding").selectOption("none");
  await expect(page.getByTestId("rounded-price")).toHaveCount(0);
  await expect(page.getByTestId("exact-price")).toHaveText("₱67.50");
  await page.getByLabel("Tubo / markup (%)").fill("0");
  await expect(page.getByTestId("exact-price")).toHaveText("₱45.00");
});
