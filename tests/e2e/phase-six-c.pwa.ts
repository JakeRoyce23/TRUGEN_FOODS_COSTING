import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { test, expect } from "@playwright/test";

const origin = "http://127.0.0.1:5179";
const root = resolve("dist");
let server: Server;
let revision = 1;

test.beforeAll(async () => {
  // Local test server only. Change the served SW revision in memory to exercise
  // a real browser update without rewriting production artifacts or deploying.
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", origin).pathname;
    const path = resolve(root, "." + pathname);
    if (!path.startsWith(root + "/") && !path.startsWith(root + "\\") && path !== root) {
      response.writeHead(403).end(); return;
    }
    const types: Record<string, string> = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
    try {
      let body = await readFile(path);
      if (pathname === "/sw.js" && revision === 2) body = Buffer.from(body.toString().replace('"trugen-foods-public-v1"', '"trugen-foods-public-v2"'));
      response.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      response.end(body);
    } catch {
      response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
      response.end(await readFile(resolve(root, "index.html")));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject); server.listen(5179, "127.0.0.1", resolve);
  });
});

test.afterAll(async () => {
  server?.closeAllConnections();
  if (server?.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("public-only cache, offline/reconnect, and a naturally waiting update", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === "supabase.test") return route.fulfill({ json: { fixture: true }, headers: { "Access-Control-Allow-Origin": origin } });
    return route.abort(); // Never contact real Supabase or any other external host.
  });
  let page = await context.newPage();
  try {
    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const cachePaths = () => page.evaluate(async () => {
      const cache = await caches.open("trugen-foods-public-v1");
      return (await cache.keys()).map((r) => new URL(r.url).pathname).sort();
    });
    const allowed = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"].sort();
    expect(await cachePaths()).toEqual(allowed);

    const apiResponse = page.waitForResponse("https://supabase.test/rest/v1/costings");
    await page.evaluate(() => fetch("https://supabase.test/rest/v1/costings").then((r) => r.json()));
    expect((await apiResponse).fromServiceWorker()).toBe(false);
    await page.evaluate(() => fetch("/manifest.webmanifest").then((r) => r.text()));
    expect(await cachePaths()).toEqual(allowed);

    await context.setOffline(true);
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await expect(page.locator("input")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto("/reset-password?code=fake-offline-code");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    expect(await cachePaths()).toEqual(allowed);
    const icon = await page.evaluate(() => fetch("/icons/icon-192.png").then((r) => ({ ok: r.ok, type: r.headers.get("content-type") })));
    expect(icon).toEqual({ ok: true, type: "image/png" });

    await context.setOffline(false);
    await page.goto("/login");
    const email = page.locator('input[type="email"]');
    await expect(email).toBeVisible();
    await email.fill("unsaved@example.test");
    await page.evaluate(async () => {
      await caches.open("unrelated-test-cache");
      // Simulate an unrelated app cache that shares only the brand prefix.
      await caches.open("trugen-foods-unrelated-v0");
    });
    revision = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
    await expect(email).toHaveValue("unsaved@example.test");
    expect(await page.evaluate(() => caches.keys())).toContain("trugen-foods-public-v1");

    await page.close(); // All app windows are now closed; allow natural activation.
    page = await context.newPage();
    await page.goto("/login");
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(registration?.active && !registration.waiting && !(await caches.keys()).includes("trugen-foods-public-v1"));
    })).toBe(true);
    expect((await page.evaluate(() => caches.keys())).sort()).toEqual(["trugen-foods-public-v2", "trugen-foods-unrelated-v0", "unrelated-test-cache"].sort());
    await expect(page.locator('input[type="email"]')).toBeVisible();
  } finally {
    await context.close();
  }
});
