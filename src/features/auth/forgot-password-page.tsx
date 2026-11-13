import { useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { supabase } from "../../lib/supabase";
import { recoveryRedirectUrl } from "./password-recovery";
import { RecoveryLayout } from "./recovery-layout";

export function ForgotPasswordPage() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !supabase) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: recoveryRedirectUrl() });
      if (result.error) {
        setError(result.error.status === 429 ? "Too many requests. Please wait a few minutes before trying again." : "Could not request a reset email. Check your connection and try again.");
      } else setSent(true);
    } catch { setError("Could not request a reset email. Check your connection and try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <RecoveryLayout title="Forgot password?" description="Request a secure link to reset your account password.">
    {!supabase && <p role="alert">Password recovery is unavailable until Supabase is configured.</p>}
    {sent ? <p role="status" className="rounded-xl bg-trugen-green-soft p-4 text-sm leading-6">If an account exists for that email, a reset link has been requested. Check your inbox and spam folder. Open the newest link on this device while the app is running.</p> : <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
      <div><Label htmlFor="recovery-email">Email address</Label><Input id="recovery-email" name="email" type="email" autoComplete="email" disabled={busy} aria-describedby={error ? "recovery-error" : undefined} /></div>
      {error && <p id="recovery-error" role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !supabase}>{busy ? "Requesting link…" : "Send reset link"}</Button>
    </form>}
  </RecoveryLayout>;
}
