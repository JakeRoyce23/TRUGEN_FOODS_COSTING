import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { Brand } from "../../components/brand";
import { MockNotice } from "../../components/mock-notice";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuth } from "../../features/auth/auth-context";
import { requireSupabase } from "../../lib/supabase";

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !auth.configured) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const nextErrors = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : "Enter a valid email address.",
      password: password ? undefined : "Enter your password.",
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    lock.current = true; setBusy(true); setLoginError("");
    try {
      const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
      if (error) setLoginError(error.code === "invalid_credentials" ? "Email or password is incorrect. Please try again." : "Sign-in failed. Check your connection and account details, then try again.");
    } catch { setLoginError("Unable to connect. Check your connection and try again."); }
    finally { lock.current = false; setBusy(false); }
  }

  const from = typeof location.state?.from === "string" && /^\/(?!\/)/.test(location.state.from) && location.state.from !== "/login" ? location.state.from : "/";
  if (auth.user) return <Navigate to={from} replace />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-trugen-canvas px-4 py-8 sm:grid sm:place-items-center">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-trugen-green-soft blur-2xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-trugen-orange-soft/80 blur-2xl" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card className="overflow-hidden shadow-lg">
          <div className="bg-trugen-green px-6 py-7 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">Mobile costing calculator</p>
            <h1 className="mt-2 font-display text-3xl font-bold">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">Sign in to prepare and review your food costings.</p>
          </div>
          <CardContent className="space-y-5 p-6">
            {!auth.configured && <MockNotice>{auth.error}</MockNotice>}
            {(loginError || (auth.configured && auth.error)) && <p role="alert" className="text-sm text-red-700">{loginError || auth.error}</p>}
            {auth.loading && <p role="status" className="text-sm">Restoring your session…</p>}
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="relative"><Mail className="absolute left-3.5 top-3.5 size-5 text-trugen-muted" aria-hidden="true" /><Input id="email" name="email" type="email" autoComplete="email" placeholder="owner@trugenfoods.ph" className="pl-11" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} /></div>
                {errors.email && <p id="email-error" className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-3.5 size-5 text-trugen-muted" aria-hidden="true" />
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" className="px-11" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0.5 top-0.5 grid size-11 place-items-center rounded-lg text-trugen-muted hover:bg-trugen-cream hover:text-trugen-green" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
                </div>
                {errors.password && <p id="password-error" className="mt-1.5 text-sm text-red-700">{errors.password}</p>}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy || auth.loading || !auth.configured}>{busy ? "Signing in…" : "Log in"}</Button>
            </form>
            <Link to="/forgot-password" className="flex min-h-11 items-center justify-center rounded-lg font-semibold text-trugen-green underline underline-offset-4">Forgot password?</Link>
            <p className="text-center text-xs leading-5 text-trugen-muted">Owner access only. Contact the project administrator for account creation.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
