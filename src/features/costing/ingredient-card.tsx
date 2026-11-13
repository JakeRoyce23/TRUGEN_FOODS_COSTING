import { PackageOpen, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { formatMoney } from "../../lib/money";
import { ingredientFieldId, units, type IngredientDraft, type IngredientField, type IngredientResult } from "./types";

type Props = {
  ingredient: IngredientDraft;
  index: number;
  canRemove: boolean;
  result: IngredientResult;
  showErrors: boolean;
  onChange: (next: IngredientDraft) => void;
  onRemove: () => void;
};

export function IngredientCard({ ingredient, index, canRemove, result, showErrors, onChange, onRemove }: Props) {
  const [touched, setTouched] = useState<Partial<Record<IngredientField, boolean>>>({});
  const fieldId = (name: string) => ingredientFieldId(ingredient.id, name);
  const update = <K extends IngredientField>(key: K, value: IngredientDraft[K]) => onChange({ ...ingredient, [key]: value });
  const errorFor = (field: IngredientField) => showErrors || touched[field] || ingredient[field] !== "" ? result.errors[field] : undefined;

  function inputField(field: "name" | "purchasedQuantity" | "usedQuantity" | "purchasePrice", label: string, placeholder: string) {
    const error = errorFor(field);
    return (
      <div className="min-w-0">
        <Label htmlFor={fieldId(field)}>{label}</Label>
        <Input id={fieldId(field)} type="text" inputMode={field === "name" ? "text" : "decimal"}
          value={ingredient[field]} placeholder={placeholder}
          onChange={(event) => update(field, event.target.value)}
          onBlur={() => setTouched((previous) => ({ ...previous, [field]: true }))}
          aria-invalid={Boolean(error)} aria-describedby={[error ? fieldId(`${field}-error`) : "", field === "purchasePrice" ? fieldId("price-help") : ""].filter(Boolean).join(" ") || undefined} />
        {error && <p id={fieldId(`${field}-error`)} className="mt-1.5 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  function unitField(field: "purchaseUnit" | "usageUnit", label: string) {
    const error = errorFor(field);
    return (
      <div>
        <Label htmlFor={fieldId(field)}>{label}</Label>
        <Select id={fieldId(field)} value={ingredient[field]}
          onChange={(event) => update(field, event.target.value as IngredientDraft[typeof field])}
          aria-invalid={Boolean(error)} aria-describedby={error ? fieldId(`${field}-error`) : undefined}>
          {units.map((unit) => <option key={unit}>{unit}</option>)}
        </Select>
        {error && <p id={fieldId(`${field}-error`)} className="mt-1.5 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <Card data-testid="ingredient-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-trugen-green-soft text-trugen-green"><PackageOpen className="size-4" aria-hidden="true" /></span>
          <h3 className="font-semibold text-trugen-ink">Ingredient {index + 1}</h3>
        </div>
        <Button type="button" variant="danger" className="shrink-0 px-3" onClick={onRemove} disabled={!canRemove}
          aria-label={`Remove ingredient ${index + 1}`} title={canRemove ? "Remove ingredient" : "At least one ingredient is required"}>
          <Trash2 className="size-4" aria-hidden="true" />Remove
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {inputField("name", "Ingredient name", "e.g. Carrots")}
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          {inputField("purchasedQuantity", "Purchased quantity", "e.g. 1")}
          {unitField("purchaseUnit", "Purchase unit")}
        </div>
        {inputField("purchasePrice", "Purchase price (₱)", "0.00")}
        <p id={fieldId("price-help")} className="text-xs leading-5 text-trugen-muted">Price paid for the full purchased quantity.</p>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          {inputField("usedQuantity", "Actual quantity used", "e.g. 0.5")}
          {unitField("usageUnit", "Usage unit")}
        </div>
        <p className="text-xs leading-5 text-trugen-muted">Quantities: up to 6 decimals, including fractional pcs. Purchase price: up to 2 decimals.</p>
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-trugen-cream px-4 py-3" aria-live="polite">
          <span className="text-sm text-trugen-muted">Ingredient cost</span>
          <output data-testid="ingredient-cost" className="max-w-full break-all font-bold text-trugen-green tabular-nums">{formatMoney(result.cost)}</output>
        </div>
        {result.cost === null && <p className="text-xs text-trugen-muted">Complete valid details to include this ingredient in the total.</p>}
      </CardContent>
    </Card>
  );
}
