import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { requireSupabase } from "../../lib/supabase";
import { clearSaveRecovery } from "../costing/save-recovery";
import { clearRecovery, getRecoveryUser, passwordError } from "./password-recovery";
import { RecoveryLayout } from "./recovery-layout";

export function ResetPasswordPage() {
  const lock = useRef(false);
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [signoutPending, setSignoutPending] = useState(false);
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(getRecoveryUser).then((user) => {
      if (alive) { setUserId(user?.id ?? ""); setEmail(user?.email ?? ""); setState(user ? "ready" : "invalid"); }
    }).catch(() => { if (alive) setState("invalid"); });
    return () => { alive = false; };
  }, []);

  async function finishSignout() {
    setBusy(true);
    try {
      const { error: signoutError } = await requireSupabase().auth.signOut({ scope: "local" });
      setSignoutPending(Boolean(signoutError));
    } catch { setSignoutPending(true); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || state !== "ready") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const validation = passwordError(password, String(data.get("confirmation") ?? ""));
    if (validation) { setError(validation); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const client = requireSupabase();
      const current = await client.auth.getUser();
      if (current.error || current.data.user?.id !== userId) { clearRecovery(); setState("invalid"); return; }
      const result = await client.auth.updateUser({ password });
      if (result.error) {
        const code = result.error.code;
        if (result.error.status === 401 || ["session_not_found", "refresh_token_not_found", "bad_jwt"].includes(code ?? "")) { clearRecovery(); setState("invalid"); }
        else setError(code === "same_password" ? "Choose a password different from your current password." : code === "weak_password" ? "Choose a stronger password with a mix of uppercase, lowercase, numbers and symbols." : "Could not confirm the password change. Check your connection; try logging in with the new password before requesting another link.");
        return;
      }
      form.reset(); setShow(false); clearRecovery(); clearSaveRecovery(); setState("done");
      await finishSignout();
    } catch { setError("Could not confirm the password change. Check your connection and try again."); }
    finally { lock.current = false; setBusy(false); }
  }

  return <RecoveryLayout title="Reset password" description="Choose a new password to protect your food costings.">
    {state === "checking" && <p role="status">Checking your reset link…</p>}
    {state === "invalid" && <><p role="alert" className="rounded-xl bg-trugen-orange-soft p-4 text-sm leading-6">This reset link is missing, expired, already used, or could not be verified. Request a new link and open it while the app is running.</p><Link to="/forgot-password" className="flex min-h-12 items-center justify-center rounded-xl bg-trugen-green px-4 font-semibold text-white">Request a new reset link</Link></>}
    {state === "done" && <><p role="status" className="rounded-xl bg-trugen-green-soft p-4 text-sm leading-6">Your password was updated. Return to login and sign in with your new password.</p>{signoutPending && <><p role="alert" className="text-sm text-red-700">Your password changed, but sign-out could not finish. Retry sign-out before returning to login.</p><Button className="w-full" disabled={busy} onClick={() => void finishSignout()}>Retry sign-out</Button></>}</>}
    {state === "ready" && <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
      <p className="break-all text-sm text-trugen-muted">Resetting password for <strong className="text-trugen-ink">{email}</strong></p>
      <p id="password-help" className="text-sm leading-6 text-trugen-muted">Use at least 8 characters. A longer, unique passphrase is best. Keep this page open until you finish; refreshing requires a new reset link.</p>
      <div><Label htmlFor="new-password">New password</Label><Input id="new-password" name="password" type={show ? "text" : "password"} autoComplete="new-password" disabled={busy} aria-describedby="password-help reset-error" /></div>
      <div><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" name="confirmation" type={show ? "text" : "password"} autoComplete="new-password" disabled={busy} aria-describedby="reset-error" /></div>
      <Button type="button" variant="outline" className="w-full" aria-pressed={show} disabled={busy} onClick={() => setShow(!show)}>{show ? "Hide passwords" : "Show passwords"}</Button>
      <p id="reset-error" role={error ? "alert" : undefined} className="text-sm text-red-700">{error}</p>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Updating password…" : "Update password"}</Button>
    </form>}
  </RecoveryLayout>;
}
