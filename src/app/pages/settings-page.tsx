import { Bell, Save, ShieldCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../features/auth/auth-context";
import { LogoutButton } from "../../features/auth/logout-button";
import type { RoundingStep } from "../../features/costing/types";
import { getOwnerSettings, saveOwnerSettings, validateOwnerSettings } from "../../features/settings/settings-repository";

import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";

export function SettingsPage() {
  const { user } = useAuth();
  const [markup, setMarkup] = useState("35");
  const [rounding, setRounding] = useState<RoundingStep>("none");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    void getOwnerSettings().then((settings) => {
      if (!active) return;
      setMarkup(settings.defaultMarkup); setRounding(settings.rounding); setLoadFailed(false);
    }).catch((reason: unknown) => {
      if (active) { setLoadFailed(true); setError(reason instanceof Error ? reason.message : "Could not load your settings. Please try again."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const validation = validateOwnerSettings(markup, rounding);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setReviewed(true); setNotice(""); setError("");
    if (validation.markup || validation.rounding) return;
    setSaving(true);
    try {
      const saved = await saveOwnerSettings(markup, rounding);
      setMarkup(saved.defaultMarkup); setRounding(saved.rounding);
      setReviewed(false);
      setNotice("Settings saved. New costings will start with these defaults.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your settings. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Preferences" title="Settings" description="Choose the starting values used when you create a new costing." />
      {notice && <p role="status" className="rounded-xl bg-trugen-green-soft p-4 text-sm font-medium text-trugen-green">{notice}</p>}
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span>{loadFailed && !loading && <Button type="button" variant="outline" onClick={() => { setLoading(true); setError(""); setNotice(""); setReload((value) => value + 1); }}>Retry</Button>}</div>}
      <form className="grid gap-5 lg:grid-cols-[1.4fr_1fr]" onSubmit={(event) => void submit(event)} noValidate aria-busy={loading || saving}>
        <Card>
          <CardHeader><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-trugen-green-soft text-trugen-green"><Bell className="size-5" /></span><div><h2 className="font-display text-lg font-bold text-trugen-ink">Costing defaults</h2><p className="text-sm text-trugen-muted">Private to this signed-in account.</p></div></div></CardHeader>
          <CardContent className="space-y-5">
            {loading ? <p role="status" className="text-sm text-trugen-muted">Loading your costing defaults…</p> : loadFailed ? <p className="text-sm text-trugen-muted">Your current defaults could not be loaded. Retry before making changes.</p> : <>
              <div><Label htmlFor="markup">Default Tubo / markup (%)</Label><Input id="markup" name="markup" type="text" inputMode="decimal" value={markup} disabled={saving} onChange={(event) => { setMarkup(event.target.value); setNotice(""); }} aria-invalid={Boolean(reviewed && validation.markup)} aria-describedby="markup-help" />{reviewed && validation.markup && <p className="mt-1.5 text-sm text-red-700">{validation.markup}</p>}<p id="markup-help" className="mt-2 text-xs leading-5 text-trugen-muted">Starts at 35%. Use up to 2 decimal places; values above 100% are allowed.</p></div>
              <div><Label htmlFor="rounding">Default selling price rounding</Label><Select id="rounding" name="rounding" value={rounding} disabled={saving} onChange={(event) => { setRounding(event.target.value as RoundingStep); setNotice(""); }}><option value="none">No rounding</option><option value="5">Round up to nearest ₱5</option><option value="10">Round up to nearest ₱10</option></Select></div>
              <Button type="submit" disabled={saving}><Save className="size-4" />{saving ? "Saving…" : "Save settings"}</Button>
            </>}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-trugen-orange-soft text-trugen-orange-dark"><UserRound className="size-5" /></span><div><h2 className="font-display text-lg font-bold text-trugen-ink">Account</h2><p className="text-sm text-trugen-muted">Signed-in owner</p></div></div></CardHeader><CardContent><dl className="space-y-3 text-sm"><div><dt className="text-trugen-muted">Name</dt><dd className="font-semibold text-trugen-ink">Business Owner</dd></div><div><dt className="text-trugen-muted">Email</dt><dd className="break-all font-semibold text-trugen-ink">{user?.email}</dd></div></dl></CardContent></Card>
          <Card><CardContent className="space-y-4 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-trugen-green" /><div><h2 className="font-semibold text-trugen-ink">Account security</h2><p className="mt-1 text-sm leading-5 text-trugen-muted">Records and settings are private to your account. To reset your password, log out and choose Forgot password? on the login page.</p></div></div><LogoutButton /></CardContent></Card>
        </div>
      </form>
    </div>
  );
}
