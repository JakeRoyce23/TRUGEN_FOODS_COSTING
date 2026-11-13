import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { formatMoney } from "../../lib/money";
import { formatSavedDate, type SavedCosting } from "../costing/costing-repository";

export function CostingCard({ item, onDelete, deleting = false }: { item: SavedCosting; onDelete?: () => void; deleting?: boolean }) {
  return <Card data-testid="saved-costing-card"><CardContent className="space-y-4 p-5">
    <h2 className="break-words font-display text-lg font-bold">{item.foodName}</h2>
    <p className="break-words text-sm text-trugen-muted">{formatSavedDate(item.createdAt)} · {item.servings} servings · {item.markup}% Tubo</p>
    <dl className="space-y-2 rounded-xl bg-trugen-cream p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><dt>Total Puhunan</dt><dd className="max-w-full break-all font-semibold">{formatMoney(item.summary.totalCost)}</dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt>Exact selling price</dt><dd className="max-w-full break-all font-bold text-trugen-green">{formatMoney(item.summary.exactPrice)}</dd></div>
      {item.summary.roundedPrice !== null && <div className="flex flex-wrap justify-between gap-2"><dt>Rounded selling price</dt><dd className="max-w-full break-all font-bold text-trugen-green">{formatMoney(item.summary.roundedPrice)}</dd></div>}
    </dl>
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline"><Link to={`/costings/${item.id}`}>View</Link></Button>
      <Button asChild variant="outline"><Link to={`/costings/${item.id}/edit`}>Edit</Link></Button>
      {onDelete && <Button type="button" variant="danger" disabled={deleting} onClick={onDelete}>{deleting ? "Deleting…" : "Delete"}</Button>}
    </div>
  </CardContent></Card>;
}
