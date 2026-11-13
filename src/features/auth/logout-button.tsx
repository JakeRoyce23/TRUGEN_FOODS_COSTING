import { LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { requireSupabase } from "../../lib/supabase";
import { clearSaveRecovery } from "../costing/save-recovery";

export function LogoutButton() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const { error } = await requireSupabase().auth.signOut();
      if (error) throw error;
      clearSaveRecovery();
    } catch {
      setError("Could not complete logout. Check your connection and try again.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <div><Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void logout()}><LogOut className="size-4" />{busy ? "Logging out…" : "Log out"}</Button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
