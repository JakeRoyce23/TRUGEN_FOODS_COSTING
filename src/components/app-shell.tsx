import { History, Home, PlusCircle, Settings, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { cn } from "../lib/utils";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { useAuth } from "../features/auth/auth-context";
import { LogoutButton } from "../features/auth/logout-button";

const primaryNav = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/new", label: "New Costing", icon: PlusCircle },
  { to: "/history", label: "History", icon: History },
];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
    isActive ? "bg-trugen-green text-white" : "text-trugen-muted hover:bg-trugen-green-soft hover:text-trugen-green",
  );
}

export function AppShell() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-trugen-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-trugen-border bg-white px-4 py-6 lg:flex lg:flex-col">
        <div className="px-2"><Brand /></div>
        <nav className="mt-10 space-y-1" aria-label="Main navigation">
          {primaryNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="size-5" aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-trugen-border pt-4">
          <NavLink to="/settings" className={navClass}><Settings className="size-5" aria-hidden="true" />Settings</NavLink>
          <div className="flex items-center gap-3 rounded-xl bg-trugen-cream px-3 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-white text-trugen-green"><UserRound className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-trugen-ink">Business Owner</p><p className="truncate text-xs text-trugen-muted" title={user?.email}>{user?.email}</p></div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-trugen-border/80 bg-trugen-canvas/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex h-17 max-w-3xl items-center justify-between px-4"><Brand /><Button asChild variant="ghost" size="icon" aria-label="Open settings"><NavLink to="/settings"><Settings className="size-5" /></NavLink></Button></div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-7 sm:px-6 sm:pt-10 lg:px-10 lg:pb-12"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-trugen-border bg-white/96 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {primaryNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.7rem] font-semibold", isActive ? "bg-trugen-green-soft text-trugen-green" : "text-trugen-muted")}>
              <Icon className="size-5" aria-hidden="true" />{label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
