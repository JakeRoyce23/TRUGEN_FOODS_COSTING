import { Calculator } from "lucide-react";

import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { formatMoney } from "../../lib/money";
import type { CostingResult, RoundingStep } from "./types";

export function CostingSummary({ result, rounding, markup, ready, foodName, saved = false }: {
  result: CostingResult; rounding: RoundingStep; markup: string; ready: boolean; foodName: string; saved?: boolean;
}) {
  return (
    <section aria-label="Costing summary" aria-live="polite" aria-atomic="true">
      <Card className="overflow-hidden">
        <CardHeader className="bg-trugen-green text-white">
          <div className="flex items-center gap-3">
            <Calculator className="size-5" aria-hidden="true" />
            <div><h2 id="costing-summary-heading" tabIndex={-1} className="rounded font-display text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-4">Costing summary</h2><p data-testid="costing-readiness" className="text-sm text-white/90">{saved ? "Saved costing" : ready ? "All entries valid · Not saved" : "Incomplete costing · Estimates only"}</p></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {!foodName.trim() && <p className="text-sm text-trugen-orange-dark">Add a food or order name to complete this costing.</p>}
          {result.isPartial && (
            <p className="rounded-xl bg-trugen-orange-soft px-3 py-3 text-sm text-trugen-orange-dark">
              {result.validCount === 0
                ? "Complete an ingredient to see costs. Blank or invalid ingredients are not treated as zero."
                : `Partial estimate: ${result.validCount} of ${result.ingredients.length} ingredients included. All amounts below exclude incomplete or invalid ingredients.`}
            </p>
          )}
          <dl className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-sm text-trugen-muted">Selected Tubo / markup</dt>
              <dd data-testid="selected-markup" className="max-w-full break-all font-semibold tabular-nums">{result.errors.markup ? "—" : `${markup.trim()}%`}</dd>
            </div>
            <SummaryRow label={result.isPartial ? "Puhunan (valid ingredients only)" : "Total Puhunan"} value={result.totalCost} testId="total-cost" />
            <SummaryRow label="Calculated Tubo" value={result.calculatedProfit} testId="calculated-profit" />
            <SummaryRow label="Exact Suggested Selling Price" value={result.exactPrice} featured testId="exact-price" />
            <SummaryRow label="Cost per Serving" value={result.costPerServing} testId="cost-per-serving" />
            <SummaryRow label="Exact Selling Price per Serving" value={result.exactPricePerServing} testId="exact-per-serving" />
          </dl>
          {rounding !== "none" && (
            <div className="space-y-4 rounded-xl border border-trugen-orange/25 bg-trugen-orange-soft/40 p-4">
              <h3 className="text-sm font-bold text-trugen-orange-dark">Optional round-up to ₱{rounding}</h3>
              <dl className="space-y-4">
                <SummaryRow label="Rounded Selling Price" value={result.roundedPrice} featured testId="rounded-price" />
                <SummaryRow label="Rounded Selling Price per Serving" value={result.roundedPricePerServing} testId="rounded-per-serving" />
                <SummaryRow label="Actual Tubo at Rounded Price" value={result.actualRoundedProfit} testId="rounded-profit" />
              </dl>
              <p className="text-xs leading-5 text-trugen-muted">Actual Tubo is the rounded total minus Puhunan. Your calculated markup and exact price stay unchanged.</p>
            </div>
          )}
          {result.errors.markup && <p className="text-sm text-trugen-orange-dark">Enter a valid markup to see selling prices and Tubo.</p>}
          {result.errors.servings && <p className="text-sm text-trugen-muted">Enter positive whole-number servings to see per-serving amounts.</p>}
          <p className="text-xs leading-5 text-trugen-muted">Amounts are rounded half-up to centavos. Per-serving amounts are rounded for display and may not multiply back to the total.</p>
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryRow({ label, value, featured = false, testId }: { label: string; value: string | null; featured?: boolean; testId: string }) {
  return (
    <div className={featured ? "space-y-1 rounded-xl bg-trugen-green-soft/70 p-3" : "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"}>
      <dt className={featured ? "text-sm font-semibold text-trugen-ink" : "text-sm text-trugen-muted"}>{label}</dt>
      <dd data-testid={testId} className={featured ? "max-w-full break-all text-3xl font-bold text-trugen-green tabular-nums" : "max-w-full break-all font-semibold text-trugen-ink tabular-nums"}>{formatMoney(value)}</dd>
    </div>
  );
}
