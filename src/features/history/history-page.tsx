import { Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useResource } from "../../lib/use-resource";
import { CostingConflictError, deleteCosting, listCostings, type SavedCosting } from "../costing/costing-repository";
import { CostingCard } from "./costing-card";

export function HistoryPage() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const deletionLock = useRef(false);
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteConflict, setDeleteConflict] = useState(false);
  const load = useCallback(() => listCostings(search, offset), [search, offset]);
  const history = useResource(`${search}:${offset}`, load);

  async function remove(item: SavedCosting) {
    if (deletionLock.current || !window.confirm(`Delete “${item.foodName}” and all its ingredients? This cannot be undone.`)) return;
    deletionLock.current = true; setDeleting(item.id); setDeleteError(""); setDeleteConflict(false); setNotice("");
    try {
      await deleteCosting(item.id, item.version);
      setNotice(`Deleted “${item.foodName}”.`);
      if (offset > 0 && history.data?.length === 1) setOffset(Math.max(0, offset - 50));
      else history.reload();
    } catch (error) { setDeleteConflict(error instanceof CostingConflictError); setDeleteError(error instanceof Error ? error.message : "Deletion failed. Please reload history."); }
    finally { deletionLock.current = false; setDeleting(null); }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Saved costings" title="Costing history" description="Your saved records, newest first. Dates use Philippine time." />
    <div className="relative max-w-xl"><Search className="absolute left-3.5 top-3.5 size-5 text-trugen-muted" aria-hidden="true" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search food or order name" className="pl-11" aria-label="Search saved costings" /></div>
    {notice && <p role="status" className="rounded-xl bg-trugen-green-soft p-4">{notice}</p>}
    {deleteError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><p>{deleteError}</p>{deleteConflict && <Button type="button" variant="outline" onClick={() => { setDeleteError(""); setDeleteConflict(false); history.reload(); }}>Reload history</Button>}</div>}
    {history.loading ? <p role="status">Loading costings…</p> : history.error ? <div className="space-y-3"><p role="alert">{history.error}</p><Button onClick={history.reload}>Retry</Button></div> : !history.data?.length ? <div className="rounded-2xl border border-trugen-border bg-white p-6 text-center">
      <h2 className="text-xl font-bold">{search || offset ? "No matching costings" : "No saved costings yet"}</h2>
      <p className="mt-2 text-sm text-trugen-muted">{search ? "Try another food or order name." : "Create and save a costing to see it here."}</p>
      {search ? <Button className="mt-4" variant="outline" onClick={() => { setSearch(""); setOffset(0); }}>Clear search</Button> : <Button asChild className="mt-4"><Link to="/new">New Costing</Link></Button>}
    </div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{history.data.map((item) => <CostingCard key={item.id} item={item} deleting={deleting !== null} onDelete={() => void remove(item)} />)}</div>}
    {(offset > 0 || history.data?.length === 50) && <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={offset === 0 || history.loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous page</Button><Button variant="outline" disabled={history.loading || history.data?.length !== 50} onClick={() => setOffset(offset + 50)}>Next page</Button></div>}
  </div>;
}
