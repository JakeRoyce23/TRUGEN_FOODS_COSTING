export const units = ["kg", "g", "L", "mL", "pcs"] as const;
export type Unit = (typeof units)[number];
export type RoundingStep = "none" | "5" | "10";

export const DEFAULT_MARKUP = "35";
export const DEFAULT_ROUNDING: RoundingStep = "none";

export type IngredientDraft = {
  id: string;
  name: string;
  purchasedQuantity: string;
  purchaseUnit: Unit;
  purchasePrice: string;
  usedQuantity: string;
  usageUnit: Unit;
};

export type IngredientField = Exclude<keyof IngredientDraft, "id">;
export type IngredientErrors = Partial<Record<IngredientField, string>>;

export const ingredientFieldId = (id: string, field: string) => `ingredient-${id}-${field}`;

export function hasIngredientEntries(ingredient: IngredientDraft): boolean {
  return Boolean(ingredient.name || ingredient.purchasedQuantity || ingredient.purchasePrice || ingredient.usedQuantity
    || ingredient.purchaseUnit !== "kg" || ingredient.usageUnit !== "kg");
}

export type IngredientResult = {
  cost: string | null;
  errors: IngredientErrors;
};

export type CostingResult = {
  ingredients: IngredientResult[];
  validCount: number;
  isPartial: boolean;
  totalCost: string | null;
  calculatedProfit: string | null;
  exactPrice: string | null;
  roundedPrice: string | null;
  actualRoundedProfit: string | null;
  costPerServing: string | null;
  exactPricePerServing: string | null;
  roundedPricePerServing: string | null;
  errors: Partial<Record<"markup" | "servings" | "rounding", string>>;
};

export function createIngredient(id: string): IngredientDraft {
  return {
    id,
    name: "",
    purchasedQuantity: "",
    purchaseUnit: "kg",
    purchasePrice: "",
    usedQuantity: "",
    usageUnit: "kg",
  };
}
