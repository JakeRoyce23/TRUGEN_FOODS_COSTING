import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const source = readFileSync("public/sw.js", "utf8");
const origin = "https://trugen.test";
const assets = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"];
type Event = { request?: unknown; waitUntil?: (promise: Promise<unknown>) => void; respondWith?: (promise: Promise<unknown>) => void };

function worker() {
  const handlers: Record<string, (event: Event) => void> = {};
  const offline = { body: "public offline page" };
  const cache = { addAll: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(offline) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue([]), delete: vi.fn().mockResolvedValue(true) };
  const fetch = vi.fn().mockResolvedValue({ body: "network" });
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  runInNewContext(source, {
    self: { location: { origin }, addEventListener: (name: string, handler: (event: Event) => void) => { handlers[name] = handler; }, skipWaiting, clients: { claim } },
    caches, fetch, URL,
    Request: class { constructor(public url: string, public options: unknown) {} },
    Response: { error: () => ({ error: true }) },
  });
  const dispatch = (path: string, method = "GET", mode = "cors", authenticated = false) => {
    const respondWith = vi.fn();
    handlers.fetch({ request: { url: new URL(path, origin).href, method, mode, headers: { has: () => authenticated } }, respondWith });
    return respondWith;
  };
  return { handlers, cache, caches, fetch, dispatch, offline, skipWaiting, claim };
}

it("installs only the four public assets without credentials and fails if precaching fails", async () => {
  const w = worker(); const waitUntil = vi.fn();
  w.handlers.install({ waitUntil });
  await waitUntil.mock.calls[0][0];
  expect(w.cache.addAll.mock.calls[0][0].map((r: { url: string }) => r.url)).toEqual(assets);
  for (const r of w.cache.addAll.mock.calls[0][0]) expect(r.options).toEqual({ credentials: "omit", cache: "reload", redirect: "error" });
  w.cache.addAll.mockRejectedValue(new Error("offline"));
  w.handlers.install({ waitUntil });
  await expect(waitUntil.mock.calls[1][0]).rejects.toThrow("offline");
});

it.each([
  ["https://project.supabase.co/auth/v1/token", "POST"],
  ["https://project.supabase.co/rest/v1/costings", "GET"],
  ["https://custom-backend.test/settings", "GET"],
  ["/rest/v1/costings", "GET"], ["/auth/v1/user", "GET"],
  ["/save", "POST"], ["/save", "PUT"], ["/save", "PATCH"], ["/save", "DELETE"],
  ["/icons/icon-192.png", "HEAD"], ["/icons/icon-192.png?token=secret", "GET"],
  ["/manifest.webmanifest", "GET"], ["/assets/app.js", "GET"],
])("bypasses %s (%s) without opening a cache or invoking fetch", (path, method) => {
  const w = worker(); expect(w.dispatch(path, method)).not.toHaveBeenCalled();
  expect(w.caches.open).not.toHaveBeenCalled(); expect(w.fetch).not.toHaveBeenCalled();
});

it("also bypasses authenticated requests to an allowlisted icon", () => {
  expect(worker().dispatch("/icons/icon-192.png", "GET", "cors", true)).not.toHaveBeenCalled();
});

it("passes navigation and recovery URLs unchanged to network without caching them", async () => {
  const w = worker();
  const response = w.dispatch("/reset-password?code=fake", "GET", "navigate");
  expect(await response.mock.calls[0][0]).toEqual({ body: "network" });
  expect(w.fetch.mock.calls[0][0].url).toBe(origin + "/reset-password?code=fake");
  expect(w.fetch.mock.calls[0][1]).toEqual({ cache: "no-store" });
  expect(w.caches.open).not.toHaveBeenCalled();
});

it("uses only the offline fallback after a navigation network failure", async () => {
  const w = worker(); w.fetch.mockRejectedValue(new Error("offline"));
  const response = w.dispatch("/history", "GET", "navigate");
  expect(await response.mock.calls[0][0]).toBe(w.offline);
  expect(w.cache.match).toHaveBeenCalledWith("/offline.html");
  expect(w.cache.addAll).not.toHaveBeenCalled();
});

it("serves icons from cache, but does not write runtime cache misses", async () => {
  const w = worker();
  await w.dispatch("/icons/icon-512.png").mock.calls[0][0];
  expect(w.fetch).not.toHaveBeenCalled();
  w.cache.match.mockResolvedValue(undefined);
  await w.dispatch("/icons/icon-512.png").mock.calls[0][0];
  expect(w.fetch).toHaveBeenCalledOnce(); expect(w.cache.addAll).not.toHaveBeenCalled();
});

it("cleans only obsolete owned caches and never forces activation or takeover", async () => {
  const w = worker(); const waitUntil = vi.fn();
  w.caches.keys.mockResolvedValue(["trugen-foods-public-v0", "trugen-foods-public-v1", "other-app-v1", "trugen-foods-other-v0"]);
  w.handlers.activate({ waitUntil }); await waitUntil.mock.calls[0][0];
  expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("trugen-foods-public-v0");
  expect(w.skipWaiting).not.toHaveBeenCalled(); expect(w.claim).not.toHaveBeenCalled();
});
