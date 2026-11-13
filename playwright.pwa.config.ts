import { defineConfig } from "@playwright/test";

// Focused Phase 6C verification of existing dist; no live accounts or API calls.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pwa.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { channel: "chrome", baseURL: "http://127.0.0.1:5179", viewport: { width: 390, height: 844 }, trace: "off" },
});
