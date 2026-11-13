import { Plus, RotateCcw } from "lucide-react";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MockNotice } from "../../components/mock-notice";
import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { calculateCosting } from "./calculations";
import { CostingSummary } from "./costing-summary";
import { IngredientCard } from "./ingredient-card";
import { createIngredient, DEFAULT_MARKUP, DEFAULT_ROUNDING, hasIngredientEntries, ingredientFieldId, type IngredientDraft, type RoundingStep } from "./types";
import { useAuth } from "../auth/auth-context";
import { CostingConflictError, saveCosting, SessionExpiredError, type SavedCosting } from "./costing-repository";
import { clearFailedSave, readFailedSave, rememberFailedSave } from "./save-recovery";
import { DEFAULT_OWNER_SETTINGS, getOwnerSettings, type OwnerSettings } from "../settings/settings-repository";

export function NewCostingPage({ initial }: { initial?: SavedCosting }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const recoveryRoute = initial?.id ?? "new";
  const [recovery] = useState(() => readFailedSave(auth.user?.id, recoveryRoute));
  const startingInput = recovery?.input ?? initial;
  const shouldLoadDefaults = !startingInput && Boolean(auth.user && auth.configured);
  const [costingDefaults, setCostingDefaults] = useState<OwnerSettings>(DEFAULT_OWNER_SETTINGS);
  const [defaultsRetry, setDefaultsRetry] = useState(0);
  const defaultsKey = shouldLoadDefaults ? `${auth.user?.id}:${defaultsRetry}` : "skip";
  const [defaultsState, setDefaultsState] = useState<{ key: string; error: string }>(() => ({ key: shouldLoadDefaults ? "" : "skip", error: "" }));
  const stableId = useId();
  const [recordId, setRecordId] = useState(() => recovery?.recordId ?? initial?.id ?? crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const saveLock = useRef(false);
  const pending = useRef<{ input: string; requestId: string } | null>(recovery ? { input: JSON.stringify(recovery.input), requestId: recovery.requestId } : null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [nextId, setNextId] = useState(2);
  const [foodName, setFoodName] = useState(startingInput?.foodName ?? "");
  const [servings, setServings] = useState(startingInput?.servings ?? "");
  const [markup, setMarkup] = useState(startingInput?.markup ?? DEFAULT_MARKUP);
  const [rounding, setRounding] = useState<RoundingStep>(startingInput?.rounding ?? DEFAULT_ROUNDING);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(startingInput?.ingredients ?? [createIngredient(`${stableId}-1`)]);
  const [expectedVersion, setExpectedVersion] = useState(recovery?.version ?? initial?.version ?? null);
  const [reviewed, setReviewed] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  const [touched, setTouched] = useState({ foodName: false, servings: false, markup: false });

  const result = useMemo(() => calculateCosting(ingredients, markup, servings, rounding), [ingredients, markup, servings, rounding]);
  const foodError = (reviewed || touched.foodName) && !foodName.trim() ? "Enter a food or order name." : undefined;
  const servingsError = reviewed || touched.servings || servings !== "" ? result.errors.servings : undefined;
  const markupError = reviewed || touched.markup || markup !== "" ? result.errors.markup : undefined;
  const ready = Boolean(foodName.trim()) && !result.isPartial && Object.keys(result.errors).length === 0;
  const issues = [
    ...(!foodName.trim() ? [{ id: "food-name", message: "Enter a food or order name." }] : []),
    ...(result.errors.servings ? [{ id: "servings", message: result.errors.servings }] : []),
    ...result.ingredients.flatMap((item, index) => (
      ["name", "purchasedQuantity", "purchaseUnit", "purchasePrice", "usedQuantity", "usageUnit"] as const
    ).flatMap((field) => item.errors[field] ? [{ id: ingredientFieldId(ingredients[index].id, field), message: item.errors[field] }] : [])),
    ...(result.errors.markup ? [{ id: "costing-markup", message: result.errors.markup }] : []),
  ];

  useEffect(() => {
    if (!shouldLoadDefaults) return;
    let active = true;
    void getOwnerSettings().then((settings) => {
      if (!active) return;
      setCostingDefaults(settings); setMarkup(settings.defaultMarkup); setRounding(settings.rounding);
      setDefaultsState({ key: defaultsKey, error: "" });
    }).catch((reason: unknown) => {
      if (active) setDefaultsState({ key: defaultsKey, error: reason instanceof Error ? reason.message : "Could not load your costing defaults. Please try again." });
    });
    return () => { active = false; };
  }, [defaultsKey, shouldLoadDefaults]);

  useEffect(() => {
    if (!focusTarget) return;
    const field = document.getElementById(focusTarget.id);
    field?.focus();
    field?.scrollIntoView?.({ block: focusTarget.id === "costing-summary-heading" ? "start" : "center" });
  }, [focusTarget]);

  function addIngredient() {
    const id = `${stableId}-${nextId}`;
    setIngredients((items) => [...items, createIngredient(id)]);
    setNextId((value) => value + 1);
    setFocusTarget({ id: ingredientFieldId(id, "name") });
  }

  function removeIngredient(ingredient: IngredientDraft, index: number) {
    if (ingredients.length <= 1) return;
    if (hasIngredientEntries(ingredient) && !window.confirm(`Remove ingredient ${index + 1}${ingredient.name.trim() ? ` (${ingredient.name.trim()})` : ""}? Its entered details will be lost.`)) return;
    const remaining = ingredients.filter((item) => item.id !== ingredient.id);
    setIngredients(remaining);
    setFocusTarget({ id: ingredientFieldId(remaining[Math.min(index, remaining.length - 1)].id, "name") });
  }

  function resetForm() {
    const hasEntries = foodName || servings || markup !== costingDefaults.defaultMarkup || rounding !== costingDefaults.rounding || ingredients.some(hasIngredientEntries);
    if (hasEntries && !window.confirm(initial ? "Discard your changes and restore the loaded costing?" : "Reset this costing? All entered details will be cleared. Unsaved entries will be lost.")) return;
    setFoodName(initial?.foodName ?? "");
    setServings(initial?.servings ?? "");
    setMarkup(initial?.markup ?? costingDefaults.defaultMarkup);
    setRounding(initial?.rounding ?? costingDefaults.rounding);
    setIngredients(initial?.ingredients ?? [createIngredient(`${stableId}-${nextId}`)]);
    setRecordId(initial?.id ?? crypto.randomUUID());
    setExpectedVersion(initial?.version ?? null);
    if (auth.user) clearFailedSave(auth.user.id, recoveryRoute);
    setSaveError(""); setConflict(false); pending.current = null;
    setNextId((value) => value + 1);
    setReviewed(false);
    setTouched({ foodName: false, servings: false, markup: false });
    setFocusTarget({ id: "food-name" });
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewed(true);
    setFocusTarget({ id: issues[0]?.id ?? "costing-summary-heading" });
  }

  async function save() {
    if (saveLock.current || !auth.user || !auth.configured) return;
    setReviewed(true);
    if (!ready) { setFocusTarget({ id: issues[0]?.id ?? "food-name" }); return; }
    const input = { foodName, servings, markup, rounding, ingredients };
    const signature = JSON.stringify(input);
    if (pending.current?.input !== signature) pending.current = { input: signature, requestId: crypto.randomUUID() };
    saveLock.current = true; setSaving(true); setSaveError(""); setConflict(false);
    try {
      const saved = await saveCosting(recordId, pending.current.requestId, expectedVersion, input);
      clearFailedSave(auth.user.id, recoveryRoute);
      if (mounted.current) navigate(`/costings/${saved.id}`, { replace: true, state: { saved: true } });
    } catch (error) {
      if (error instanceof SessionExpiredError || !mounted.current) rememberFailedSave(auth.user.id, recoveryRoute, { input, recordId, requestId: pending.current.requestId, version: expectedVersion });
      if (mounted.current) { setConflict(error instanceof CostingConflictError); setSaveError(error instanceof Error ? error.message : "Saving failed. Your entries are still here. Please retry."); }
    } finally { saveLock.current = false; if (mounted.current) setSaving(false); }
  }

  if (defaultsState.key !== defaultsKey) return <p role="status" className="rounded-xl bg-white p-5 text-trugen-muted shadow-card">Loading your costing defaults…</p>;
  if (defaultsState.error) return <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5"><p role="alert" className="text-red-800">{defaultsState.error}</p><Button type="button" variant="outline" onClick={() => setDefaultsRetry((value) => value + 1)}>Retry</Button></div>;

  return (
    <form onSubmit={review} noValidate aria-busy={saving}>
      <fieldset disabled={saving} className="min-w-0 space-y-7">
      <PageHeader eyebrow={initial ? "Edit costing" : "New costing"} title={initial ? "Edit your food costing" : "Build your food costing"} description="Enter your ingredients to see Puhunan, Tubo, and selling prices update instantly."
        action={<div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setFocusTarget({ id: "costing-summary-heading" })}>View results</Button><Button type="button" variant="outline" onClick={resetForm}><RotateCcw className="size-4" />Reset</Button></div>} />
      <MockNotice>Calculations are live. Unsaved changes are lost when you leave or refresh. Use {initial ? "Save changes" : "Save costing"} to keep this costing in your account.</MockNotice>
      {recovery && <p role="status" className="rounded-xl bg-trugen-green-soft p-4">Your failed save was recovered from this tab. Review the entries and retry. It is not permanently saved yet.</p>}
      {reviewed && issues.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-800">Your costing is incomplete. Check {issues.length} {issues.length === 1 ? "field" : "fields"}.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => setFocusTarget({ id: issues[0].id })}>Fix first issue</Button>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader><h2 className="font-display text-xl font-bold text-trugen-ink">Order details</h2><p className="text-sm text-trugen-muted">Give this costing a clear name and serving count.</p></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div>
                <Label htmlFor="food-name">Food / order name</Label>
                <Input id="food-name" value={foodName} onChange={(event) => setFoodName(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, foodName: true }))}
                  placeholder="e.g. Chicken Pastil Trays" aria-invalid={Boolean(foodError)} aria-describedby={foodError ? "food-name-error" : undefined} />
                {foodError && <p id="food-name-error" className="mt-1.5 text-sm text-red-700">{foodError}</p>}
              </div>
              <div>
                <Label htmlFor="servings">Number of servings</Label>
                <Input id="servings" type="text" inputMode="numeric" value={servings} onChange={(event) => setServings(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, servings: true }))}
                  placeholder="e.g. 10" aria-invalid={Boolean(servingsError)} aria-describedby={servingsError ? "servings-error" : undefined} />
                {servingsError && <p id="servings-error" className="mt-1.5 text-sm text-red-700">{servingsError}</p>}
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4" aria-labelledby="ingredients-heading">
            <div><h2 id="ingredients-heading" className="font-display text-xl font-bold text-trugen-ink">Ingredients</h2><p className="mt-1 text-sm text-trugen-muted">{ingredients.length} {ingredients.length === 1 ? "ingredient" : "ingredients"}</p></div>
            {ingredients.map((ingredient, index) => (
              <IngredientCard key={ingredient.id} ingredient={ingredient} index={index} result={result.ingredients[index]} showErrors={reviewed} canRemove={ingredients.length > 1}
                onChange={(next) => setIngredients((items) => items.map((item) => item.id === ingredient.id ? next : item))}
                onRemove={() => removeIngredient(ingredient, index)} />
            ))}
            <Button type="button" variant="outline" size="lg" className="w-full border-dashed border-trugen-green/40 text-trugen-green" onClick={addIngredient}><Plus className="size-5" />Add Ingredient</Button>
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><h2 className="font-display text-lg font-bold text-trugen-ink">Markup &amp; rounding</h2></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="costing-markup">Tubo / markup (%)</Label>
                <Input id="costing-markup" type="text" inputMode="decimal" value={markup} onChange={(event) => setMarkup(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, markup: true }))}
                  aria-invalid={Boolean(markupError)} aria-describedby={markupError ? "markup-error markup-help" : "markup-help"} />
                {markupError && <p id="markup-error" className="mt-1.5 text-sm text-red-700">{markupError}</p>}
                <p id="markup-help" className="mt-2 text-xs leading-5 text-trugen-muted">Markup on ingredient cost. Up to 2 decimals; values above 100% are allowed.</p>
              </div>
              <div><Label htmlFor="costing-rounding">Optional price rounding</Label><Select id="costing-rounding" value={rounding} onChange={(event) => setRounding(event.target.value as RoundingStep)}>
                <option value="none">No rounding</option><option value="5">Round up to nearest ₱5</option><option value="10">Round up to nearest ₱10</option>
              </Select></div>
            </CardContent>
          </Card>
          <CostingSummary result={result} rounding={rounding} markup={markup} ready={ready} foodName={foodName} />
          <Button type="button" variant="outline" className="w-full" onClick={() => setFocusTarget({ id: ingredientFieldId(ingredients[0].id, "name") })}>Back to ingredients</Button>
          <Button type="submit" size="lg" className="w-full">Review costing</Button>
          {reviewed && <p role="status" className="text-sm text-trugen-muted">{ready ? "All entries are valid. Your costing is calculated but has not been saved." : "Check the highlighted fields. Your costing is incomplete."}</p>}
          {saveError && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{saveError}</p>{conflict && <Button type="button" variant="outline" onClick={() => {
            if (window.confirm("Reload the latest saved version? Your unsaved changes on this form will be discarded.")) navigate(`/costings/${recordId}`, { replace: true });
          }}>Reload latest version</Button>}</div>}
          <Button type="button" className="w-full" disabled={!ready || !auth.user || !auth.configured || saving} onClick={() => void save()}>{saving ? "Saving…" : initial ? "Save changes" : "Save costing"}</Button>
        </aside>
      </div>
      </fieldset>
    </form>
  );
}
