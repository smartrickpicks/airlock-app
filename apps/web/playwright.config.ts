import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Airlock Web App
 *
 * Runs against the Next.js dev server on port 3000.
 * Auth is handled via a global setup that injects the dev token cookie.
 *
 * Usage:
 *   pnpm --filter @airlock/web test:e2e           # Run all tests
 *   pnpm --filter @airlock/web test:e2e:ui         # Interactive UI mode
 *   pnpm --filter @airlock/web test:e2e -- --update-snapshots  # Update screenshots
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    // Auth setup — runs first, saves cookie state for all test projects
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Desktop Chromium (primary — 1440x900)
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.auth/user.json",
        viewport: { width: 1440, height: 900 },
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
