import { useCallback } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useResource } from "../../lib/use-resource";
import { formatMoney } from "../../lib/money";
import { getCosting, formatSavedDate } from "./costing-repository";
import { NewCostingPage } from "./new-costing-page";
import { CostingSummary } from "./costing-summary";

export function SavedCostingPage({ editing = false }: { editing?: boolean }) {
  const { id = "" } = useParams();
  const location = useLocation();
  const load = useCallback(() => getCosting(id), [id]);
  // View and edit share this component: every navigation must re-fetch, especially
  // when a confirmed edit returns to the same costing ID with a newer revision.
  const record = useResource(`${id}:${location.key}`, load);
  if (record.loading) return <p role="status">Loading costing…</p>;
  if (record.error || !record.data) return <div className="space-y-4"><p role="alert">{record.error ?? "Costing unavailable."}</p><Button onClick={record.reload}>Retry</Button><Button asChild variant="outline"><Link to="/history">Back to history</Link></Button></div>;
  const item = record.data;
  if (editing) return <NewCostingPage key={`${item.id}-${item.version}`} initial={item} />;
  return <div className="space-y-6">
    <PageHeader eyebrow="Saved costing" title={item.foodName} description={`${item.servings} servings · Created ${formatSavedDate(item.createdAt)} · Updated ${formatSavedDate(item.updatedAt)}`} action={<Button asChild><Link to={`/costings/${item.id}/edit`}>Edit costing</Link></Button>} />
    {location.state?.saved && <p role="status" className="rounded-xl bg-trugen-green-soft p-4 text-trugen-green">Costing saved successfully.</p>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4" aria-label="Saved ingredients">
        <h2 className="text-xl font-bold">Ingredients</h2>
        {item.ingredients.map((ingredient, index) => <Card key={ingredient.id}><CardContent className="space-y-3 p-5">
          <h3 className="break-words text-lg font-semibold">{ingredient.name}</h3>
          <p className="break-words text-sm">Purchased: {ingredient.purchasedQuantity} {ingredient.purchaseUnit} for {formatMoney(ingredient.purchasePrice)}</p>
          <p className="break-words text-sm">Used: {ingredient.usedQuantity} {ingredient.usageUnit}</p>
          <p className="break-all font-semibold text-trugen-green">Ingredient cost: {formatMoney(item.summary.ingredients[index].cost)}</p>
        </CardContent></Card>)}
      </section>
      <CostingSummary result={item.summary} markup={item.markup} rounding={item.rounding} foodName={item.foodName} ready saved />
    </div>
    <Button asChild variant="outline"><Link to="/history">Back to history</Link></Button>
  </div>;
}
