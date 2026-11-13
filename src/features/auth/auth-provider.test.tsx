import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";
import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { useAuth } from "./auth-context";

const session = (expiry = Math.floor(Date.now() / 1000) + 3600) => ({ user: { id: "owner", email: "owner@example.test" }, expires_at: expiry }) as Session;
let listener: (event: AuthChangeEvent, session: Session | null) => void;
const unsubscribe = vi.fn();
function client(value: Session | null) {
  return { auth: { onAuthStateChange: (callback: typeof listener) => { listener = callback; return { data: { subscription: { unsubscribe } } }; }, getSession: vi.fn().mockResolvedValue({ data: { session: value }, error: null }) } } as unknown as SupabaseClient;
}
function Status() { const state = useAuth(); return <p>{state.loading ? "loading" : state.user?.email ?? "signed out"}{state.error}</p>; }
afterEach(() => { vi.useRealTimers(); unsubscribe.mockReset(); });

it("restores a valid session and subscribes to logout", async () => {
  const view = render(<AuthProvider client={client(session())}><Status /></AuthProvider>);
  expect(await screen.findByText("owner@example.test")).toBeInTheDocument();
  act(() => listener("SIGNED_OUT", null));
  expect(screen.getByText("signed out")).toBeInTheDocument();
  view.unmount(); expect(unsubscribe).toHaveBeenCalled();
});
it("does not authorize a missing or expired session", async () => {
  render(<AuthProvider client={client(session(1))}><Status /></AuthProvider>);
  expect(await screen.findByText(/Your session expired/)).toHaveTextContent("signed out");
});
it("ends access at expiry unless the SDK refreshes the session", async () => {
  vi.useFakeTimers();
  await act(async () => { render(<AuthProvider client={client(session(Math.floor(Date.now() / 1000) + 2))}><Status /></AuthProvider>); });
  expect(screen.getByText("owner@example.test")).toBeInTheDocument();
  act(() => listener("TOKEN_REFRESHED", session(Math.floor(Date.now() / 1000) + 10)));
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByText("owner@example.test")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.getByText(/Your session expired/)).toHaveTextContent("signed out");
});
it("keeps the latest auth event if an earlier session read resolves late", async () => {
  let resolve!: (value: Awaited<ReturnType<SupabaseClient["auth"]["getSession"]>>) => void;
  const authClient = client(null);
  vi.mocked(authClient.auth.getSession).mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<AuthProvider client={authClient}><Status /></AuthProvider>);
  act(() => listener("SIGNED_IN", session()));
  await act(async () => { resolve({ data: { session: null }, error: null }); });
  expect(screen.getByText("owner@example.test")).toBeInTheDocument();
});
