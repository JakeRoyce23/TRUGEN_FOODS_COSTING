import { describe, expect, it } from "vitest";

import { formatMoney } from "../../lib/money";
import { calculateCosting, calculateIngredient, validateServings } from "./calculations";
import { createIngredient, type IngredientDraft } from "./types";

const row = (changes: Partial<IngredientDraft> = {}): IngredientDraft => ({
  ...createIngredient("test"), name: "Carrots", purchasedQuantity: "1", purchasePrice: "120", usedQuantity: "0.5", ...changes,
});

describe("ingredient costing and conversions", () => {
  it("costs a half-used purchase and does not mutate the inputs", () => {
    const input = Object.freeze(row());
    expect(calculateIngredient(input)).toEqual({ cost: "60.00", errors: {} });
  });

  it.each([
    [{ purchasedQuantity: "500", purchaseUnit: "g", purchasePrice: "90", usedQuantity: "0.2", usageUnit: "kg" }, "36.00"],
    [{ usedQuantity: "500", usageUnit: "g" }, "60.00"],
    [{ purchaseUnit: "L", usedQuantity: "250", usageUnit: "mL", purchasePrice: "80" }, "20.00"],
    [{ purchasedQuantity: "500", purchaseUnit: "mL", usedQuantity: "0.2", usageUnit: "L", purchasePrice: "90" }, "36.00"],
    [{ purchaseUnit: "pcs", usageUnit: "pcs", usedQuantity: "0.5", purchasePrice: "20" }, "10.00"],
    [{ purchaseUnit: "pcs", usageUnit: "pcs", purchasedQuantity: "0.123456", usedQuantity: "0.061728" }, "60.00"],
    [{ usedQuantity: "1000", usageUnit: "g" }, "120.00"],
  ] satisfies [Partial<IngredientDraft>, string][]) ("converts compatible quantities: %j", (changes, expected) => {
    expect(calculateIngredient(row(changes)).cost).toBe(expected);
  });

  it.each([
    ["name", " "], ["purchasedQuantity", ""], ["purchasedQuantity", "0"], ["purchasedQuantity", "-1"],
    ["usedQuantity", "0"], ["usedQuantity", "-1"], ["usedQuantity", "2"], ["purchasePrice", "-1"],
    ["purchasePrice", ""], ["purchasePrice", "NaN"], ["purchasePrice", "Infinity"],
    ["purchasePrice", "1e3"], ["purchasePrice", "0x10"], ["purchasePrice", "12,000"],
    ["purchasePrice", "10.001"], ["usedQuantity", "0.1234567"], ["purchasedQuantity", "1.0000001"],
    ["purchaseUnit", ""], ["purchaseUnit", "bag"], ["usageUnit", "L"], ["usageUnit", "__proto__"],
  ])("rejects invalid %s=%s without NaN or zero-cost substitution", (field, value) => {
    const result = calculateIngredient(row({ [field]: value }));
    expect(result.cost).toBeNull();
    expect(Object.keys(result.errors)).not.toHaveLength(0);
  });

  it("compares usage in base units and catches one millionth above the purchase", () => {
    const result = calculateIngredient(row({ usedQuantity: "1000.000001", usageUnit: "g" }));
    expect(result.errors.usedQuantity).toMatch(/cannot exceed/);
    expect(result.cost).toBeNull();
  });

  it("accepts a legitimate zero price and ordinary leading/trailing decimal input", () => {
    expect(calculateIngredient(row({ purchasePrice: "0" })).cost).toBe("0.00");
    expect(calculateIngredient(row({ purchasedQuantity: "1.", usedQuantity: ".5" })).cost).toBe("60.00");
  });
});

describe("summary, markup, and rounding", () => {
  it("matches every amount in the owner's approved example", () => {
    const result = calculateCosting([row({ purchasePrice: "1300" })], "35", "10", "10");
    expect(result).toMatchObject({
      validCount: 1, isPartial: false, errors: {}, totalCost: "650.00",
      calculatedProfit: "227.50", exactPrice: "877.50", costPerServing: "65.00",
      exactPricePerServing: "87.75", roundedPrice: "880.00",
      roundedPricePerServing: "88.00", actualRoundedProfit: "230.00",
    });
  });

  it("sums multiple independently rounded lines before computing profit", () => {
    const result = calculateCosting([row({ purchasePrice: "0.01" }), row({ purchasePrice: "0.01" })], "25", "4", "none");
    expect(result).toMatchObject({ totalCost: "0.02", calculatedProfit: "0.01", exactPrice: "0.03", costPerServing: "0.01", exactPricePerServing: "0.01", roundedPrice: null });
  });

  it.each([
    ["0", "0.00", "60.00"], ["150", "90.00", "150.00"], ["12.34", "7.40", "67.40"],
  ])("supports markup %s including zero and above 100", (markup, profit, price) => {
    expect(calculateCosting([row()], markup, "1", "none")).toMatchObject({ calculatedProfit: profit, exactPrice: price });
  });

  it.each(["", "-1", "35.001", "NaN", "Infinity", "1e2", "35%"])("rejects invalid markup %s but retains known cost", (markup) => {
    const result = calculateCosting([row()], markup, "10", "10");
    expect(result.errors.markup).toBeTruthy();
    expect(result).toMatchObject({ totalCost: "60.00", costPerServing: "6.00", calculatedProfit: null, exactPrice: null, roundedPrice: null, actualRoundedProfit: null });
  });

  it.each(["", "0", "-1", "1.5", "NaN", "Infinity", "1e3"])("rejects invalid servings %s without division by zero", (servings) => {
    expect(validateServings(servings).value).toBeNull();
    const result = calculateCosting([row()], "35", servings, "10");
    expect(result).toMatchObject({ totalCost: "60.00", exactPrice: "81.00", costPerServing: null, exactPricePerServing: null, roundedPricePerServing: null });
  });

  it("accepts whole-number servings expressed as 10.0", () => {
    expect(calculateCosting([row()], "35", "10.0", "none").exactPricePerServing).toBe("8.10");
  });

  it.each([
    ["none", null], ["5", "85.00"], ["10", "90.00"],
  ])("applies optional rounding %s while preserving the exact price", (step, expected) => {
    expect(calculateCosting([row()], "35", "10", step)).toMatchObject({ exactPrice: "81.00", calculatedProfit: "21.00", roundedPrice: expected });
  });

  it("does not increase an exact multiple and handles zero-priced orders", () => {
    expect(calculateCosting([row()], "0", "10", "10").roundedPrice).toBe("60.00");
    expect(calculateCosting([row({ purchasePrice: "0" })], "35", "10", "5")).toMatchObject({ totalCost: "0.00", roundedPrice: "0.00", actualRoundedProfit: "0.00", validCount: 1 });
  });

  it("rejects unsupported rounding steps without replacing the exact calculation", () => {
    const result = calculateCosting([row()], "35", "10", "0");
    expect(result.errors.rounding).toBeTruthy();
    expect(result).toMatchObject({ exactPrice: "81.00", roundedPrice: null });
  });

  it("excludes invalid rows explicitly, returns no total for an empty costing, and never treats blanks as zero", () => {
    const blank = createIngredient("blank");
    expect(calculateCosting([row(), blank], "35", "10", "none")).toMatchObject({ validCount: 1, isPartial: true, totalCost: "60.00" });
    for (const drafts of [[], [blank]]) {
      expect(calculateCosting(drafts, "35", "10", "none")).toMatchObject({ validCount: 0, isPartial: true, totalCost: null, exactPrice: null });
    }
  });
});

describe("financial precision", () => {
  it.each([
    ["2.01", "1.01"], ["2.67", "1.34"], ["0.01", "0.01"],
  ])("rounds an exact half cent up for purchase price %s", (price, expected) => {
    expect(calculateIngredient(row({ purchasePrice: price })).cost).toBe(expected);
  });

  it("does not round a recurring unit price before multiplying", () => {
    expect(calculateIngredient(row({ purchasedQuantity: "3", usedQuantity: "3", purchasePrice: "1" })).cost).toBe("1.00");
  });

  it("preserves small increments beside amounts beyond Number precision", () => {
    const result = calculateCosting([
      row({ purchasePrice: "9007199254740993.01", usedQuantity: "1" }),
      row({ purchasePrice: "0.01", usedQuantity: "1" }),
    ], "0", "1", "none");
    expect(result.totalCost).toBe("9007199254740993.02");
    expect(formatMoney(result.totalCost)).toBe("₱9,007,199,254,740,993.02");
  });

  it("retains centavos with very large numeric inputs rather than applying a hidden business maximum", () => {
    const amount = "9".repeat(80) + ".99";
    expect(calculateCosting([row({ purchasePrice: amount, usedQuantity: "1" })], "0", "1", "none").exactPrice).toBe(amount);
  });

  it("formats PHP money without rounding through binary floating point", () => {
    expect(formatMoney("1000.005")).toBe("₱1,000.01");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney("NaN")).toBe("—");
  });
});

describe("realistic recipe regression scenarios", () => {
  it("costs chicken rice trays using partial bulk purchases", () => {
    const result = calculateCosting([
      row({ name: "Chicken", purchasedQuantity: "2", purchasePrice: "300", usedQuantity: "1.5" }),
      row({ name: "Rice", purchasedQuantity: "5", purchasePrice: "250", usedQuantity: "2" }),
      row({ name: "Oil", purchaseUnit: "L", purchasePrice: "130", usedQuantity: "500", usageUnit: "mL" }),
    ], "35", "10", "10");
    expect(result.ingredients.map((item) => item.cost)).toEqual(["225.00", "100.00", "65.00"]);
    expect(result).toMatchObject({ totalCost: "390.00", calculatedProfit: "136.50", exactPrice: "526.50", costPerServing: "39.00", exactPricePerServing: "52.65", roundedPrice: "530.00", roundedPricePerServing: "53.00", actualRoundedProfit: "140.00", isPartial: false });
  });

  it("costs a small pancake batch with mass, volume, and fractional eggs", () => {
    const result = calculateCosting([
      row({ name: "Flour", purchasePrice: "80", usedQuantity: "250", usageUnit: "g" }),
      row({ name: "Milk", purchaseUnit: "L", purchasePrice: "100", usedQuantity: "200", usageUnit: "mL" }),
      row({ name: "Egg", purchaseUnit: "pcs", usageUnit: "pcs", purchasePrice: "10", usedQuantity: "0.5" }),
    ], "50", "3", "5");
    expect(result.ingredients.map((item) => item.cost)).toEqual(["20.00", "20.00", "5.00"]);
    expect(result).toMatchObject({ totalCost: "45.00", calculatedProfit: "22.50", exactPrice: "67.50", costPerServing: "15.00", exactPricePerServing: "22.50", roundedPrice: "70.00", roundedPricePerServing: "23.33", actualRoundedProfit: "25.00" });
  });

  it("costs a single vegetable side with a fractional markup and recurring per-serving price", () => {
    expect(calculateCosting([row()], "12.34", "3", "5")).toMatchObject({ totalCost: "60.00", calculatedProfit: "7.40", exactPrice: "67.40", costPerServing: "20.00", exactPricePerServing: "22.47", roundedPrice: "70.00", roundedPricePerServing: "23.33", actualRoundedProfit: "10.00" });
  });

  it("reports incompatible units even while other fields are incomplete", () => {
    const result = calculateIngredient({ ...createIngredient("missing"), usageUnit: "L" });
    expect(result.cost).toBeNull();
    expect(result.errors).toHaveProperty("name");
    expect(result.errors).toHaveProperty("purchasePrice");
    expect(result.errors.usageUnit).toContain("kg/g, L/mL, or pcs/pcs");
  });

  it("reports excess usage even while the ingredient name and price are missing", () => {
    const result = calculateIngredient(row({ name: "", purchasePrice: "", usedQuantity: "2" }));
    expect(result.cost).toBeNull();
    expect(result.errors).toHaveProperty("name");
    expect(result.errors).toHaveProperty("purchasePrice");
    expect(result.errors.usedQuantity).toContain("Reduce usage");
  });
});
