import Decimal from "decimal.js";

import { units, type CostingResult, type IngredientDraft, type IngredientErrors, type IngredientResult, type Unit } from "./types";

const unitDefinitions: Record<Unit, { category: string; factor: string }> = {
  kg: { category: "mass", factor: "1000" },
  g: { category: "mass", factor: "1" },
  L: { category: "volume", factor: "1000" },
  mL: { category: "volume", factor: "1" },
  pcs: { category: "count", factor: "1" },
};

function isUnit(value: string): value is Unit {
  return (units as readonly string[]).includes(value);
}

// Scale working precision with the supplied digits rather than silently clipping
// large inputs at Decimal's default 20 significant digits. The extra digits cover
// base-unit factors, centavos, percentages, and division near half-cent boundaries.
function decimalContext(values: string[]) {
  return Decimal.clone({
    precision: Math.max(40, values.reduce((size, value) => size + value.length, 0) + 32),
    rounding: Decimal.ROUND_HALF_UP,
  });
}

type ParsedInput = { value: Decimal; error?: never } | { value: null; error: string };

function parseInput(raw: string, places: number, positive: boolean): ParsedInput {
  const value = raw.trim();
  if (!value) return { value: null, error: "This field is required." };
  // Accept ordinary decimals only. Never coerce blank, NaN, Infinity, hexadecimal,
  // or exponent notation to a usable quantity or monetary amount.
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
    return { value: null, error: "Enter a valid decimal number." };
  }
  const decimal = new Decimal(value);
  if (!decimal.isFinite()) return { value: null, error: "Enter a finite number." };
  if (decimal.isNegative() || (positive && decimal.isZero())) {
    return { value: null, error: positive ? "Enter a number greater than zero." : "Enter zero or a positive number." };
  }
  if ((value.split(".")[1]?.length ?? 0) > places) {
    return { value: null, error: `Use at most ${places} decimal places.` };
  }
  return { value: decimal };
}

export function validateServings(raw: string): ParsedInput {
  // A positive mathematical whole number is valid, including a pasted '10.0'.
  const value = raw.trim();
  if (!/^(?:\d+(?:\.0*)?)$/.test(value)) {
    return { value: null, error: "Enter a positive whole number." };
  }
  const parsed = new Decimal(value);
  return parsed.isFinite() && parsed.isInteger() && parsed.gt(0)
    ? { value: parsed }
    : { value: null, error: "Enter a positive whole number." };
}

export function calculateIngredient(ingredient: IngredientDraft): IngredientResult {
  const errors: IngredientErrors = {};
  if (!ingredient.name.trim()) errors.name = "Enter an ingredient name.";
  const purchased = parseInput(ingredient.purchasedQuantity, 6, true);
  const used = parseInput(ingredient.usedQuantity, 6, true);
  const price = parseInput(ingredient.purchasePrice, 2, false);
  if (purchased.error) errors.purchasedQuantity = purchased.error;
  if (used.error) errors.usedQuantity = used.error;
  if (price.error) errors.purchasePrice = price.error;
  const purchaseUnit = ingredient.purchaseUnit;
  const usageUnit = ingredient.usageUnit;
  if (!isUnit(purchaseUnit)) errors.purchaseUnit = "Select a supported purchase unit.";
  if (!isUnit(usageUnit)) errors.usageUnit = "Select a supported usage unit.";
  if (errors.purchaseUnit || errors.usageUnit) {
    return { cost: null, errors };
  }
  const purchaseDefinition = unitDefinitions[purchaseUnit];
  const usageDefinition = unitDefinitions[usageUnit];
  if (purchaseDefinition.category !== usageDefinition.category) {
    errors.usageUnit = "Choose compatible units: kg/g, L/mL, or pcs/pcs.";
    return { cost: null, errors };
  }

  if (!purchased.value || !used.value) return { cost: null, errors };
  const D = decimalContext([ingredient.purchasedQuantity, ingredient.usedQuantity, ingredient.purchasePrice]);
  const purchaseBase = new D(purchased.value).mul(purchaseDefinition.factor);
  const usedBase = new D(used.value).mul(usageDefinition.factor);
  if (usedBase.gt(purchaseBase)) {
    errors.usedQuantity = "Usage cannot exceed the purchased quantity. Reduce usage or increase the purchased quantity.";
  }
  if (Object.keys(errors).length || !price.value) return { cost: null, errors };
  // Multiply before division so recurring unit prices are never rounded early.
  const cost = new D(price.value).mul(usedBase).div(purchaseBase);
  return { cost: cost.toFixed(2, Decimal.ROUND_HALF_UP), errors: {} };
}

export function calculateCosting(
  drafts: IngredientDraft[],
  markupInput: string,
  servingsInput: string,
  rounding: string,
): CostingResult {
  const ingredients = drafts.map(calculateIngredient);
  const validCosts = ingredients.flatMap((item) => item.cost === null ? [] : [item.cost]);
  const markup = parseInput(markupInput, 2, false);
  const servings = validateServings(servingsInput);
  const validRounding = rounding === "none" || rounding === "5" || rounding === "10";
  const errors: CostingResult["errors"] = {};
  if (markup.error) errors.markup = markup.error;
  if (servings.error) errors.servings = servings.error;
  if (!validRounding) errors.rounding = "Select no rounding, ₱5, or ₱10.";

  const D = decimalContext([...validCosts, markupInput, servingsInput]);
  const total = validCosts.length ? validCosts.reduce((sum, value) => sum.plus(value), new D(0)) : null;
  const profit = total !== null && markup.value !== null
    ? total.mul(markup.value).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    : null;
  const exactPrice = total !== null && profit !== null ? total.plus(profit) : null;
  const roundedPrice = exactPrice !== null && validRounding && rounding !== "none"
    ? exactPrice.div(rounding).ceil().mul(rounding)
    : null;
  const perServing = (amount: Decimal | null) => amount !== null && servings.value !== null
    ? amount.div(servings.value).toFixed(2, Decimal.ROUND_HALF_UP)
    : null;

  return {
    ingredients,
    validCount: validCosts.length,
    isPartial: validCosts.length !== drafts.length || drafts.length === 0,
    totalCost: total?.toFixed(2) ?? null,
    calculatedProfit: profit?.toFixed(2) ?? null,
    exactPrice: exactPrice?.toFixed(2) ?? null,
    roundedPrice: roundedPrice?.toFixed(2) ?? null,
    actualRoundedProfit: roundedPrice !== null && total !== null ? roundedPrice.minus(total).toFixed(2) : null,
    costPerServing: perServing(total),
    exactPricePerServing: perServing(exactPrice),
    roundedPricePerServing: perServing(roundedPrice),
    errors,
  };
}
