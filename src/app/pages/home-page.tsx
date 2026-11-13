import { ArrowRight, Plus } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useResource } from "../../lib/use-resource";
import { listCostings } from "../../features/costing/costing-repository";
import { CostingCard } from "../../features/history/costing-card";

export function HomePage() {
  const load = useCallback(() => listCostings().then((items) => items.slice(0, 3)), []);
  const recent = useResource("recent", load);
  return <div className="space-y-8">
    <PageHeader eyebrow="Home" title="Magandang araw!" description="Start a new food costing or revisit a saved estimate." />
    <section className="relative overflow-hidden rounded-3xl bg-trugen-green p-6 text-white shadow-lg sm:p-8">
      <div className="absolute -right-14 -top-16 size-52 rounded-full border-[2.5rem] border-white/5" />
      <div className="relative max-w-lg"><Badge className="bg-white/12 text-white">Quick action</Badge><h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Cost your next food order with confidence.</h2><p className="mt-3 text-sm leading-6 text-white/75">Enter your ingredients, adjust your markup, and see your food costing update instantly.</p><Button asChild size="lg" className="mt-6 bg-white text-trugen-green hover:bg-trugen-cream"><Link to="/new"><Plus className="size-5" />New Costing</Link></Button></div>
    </section>
    <section aria-labelledby="recent-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="recent-heading" className="text-xl font-bold">Recent costings</h2><Button asChild variant="ghost"><Link to="/history">View all<ArrowRight className="size-4" /></Link></Button></div>
      {recent.loading ? <p role="status">Loading recent costings…</p> : recent.error ? <div className="space-y-3"><p role="alert">{recent.error}</p><Button onClick={recent.reload}>Retry</Button></div> : recent.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recent.data.map((item) => <CostingCard key={item.id} item={item} />)}</div> : <p className="rounded-xl border border-trugen-border bg-white p-5">No saved costings yet. Start your first costing above.</p>}
    </section>
  </div>;
}
