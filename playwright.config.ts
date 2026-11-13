import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5178",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "small-phone-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "tablet-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5178 --strictPort",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: false,
    // Fake project used ONLY by intercepted browser tests; never a live credential.
    env: { VITE_SUPABASE_URL: "https://supabase.test", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture_not_a_real_key" },
    timeout: 120_000,
  },
});
