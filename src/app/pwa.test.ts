import { afterEach, expect, it, vi } from "vitest";
import { registerPwa } from "./pwa";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function mockRegistration() {
  const register = vi.fn().mockResolvedValue({});
  vi.spyOn(navigator, "serviceWorker", "get").mockReturnValue({ register } as unknown as ServiceWorkerContainer);
  return register;
}

// jsdom has no service-worker implementation.
Object.defineProperty(navigator, "serviceWorker", { configurable: true, get: () => undefined });

it("does not register during local development", async () => {
  vi.stubEnv("PROD", false);
  const register = mockRegistration();
  await registerPwa();
  expect(register).not.toHaveBeenCalled();
});

it("registers a root-scoped production worker without HTTP-cache reuse", async () => {
  vi.stubEnv("PROD", true);
  const register = mockRegistration();
  await registerPwa();
  expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
});

it("contains registration failures without exposing raw errors", async () => {
  vi.stubEnv("PROD", true);
  const register = mockRegistration();
  register.mockRejectedValue(new Error("sensitive callback details"));
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(registerPwa()).resolves.toBeUndefined();
  expect(warn).toHaveBeenCalledExactlyOnceWith("Offline support is unavailable. You can continue using TRUGEN FOODS online.");
});
