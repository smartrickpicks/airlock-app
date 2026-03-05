import { chromium, type FullConfig } from "@playwright/test";

/**
 * Global Setup: Authenticates a dev user and saves the auth state.
 *
 * All test projects reference the saved storageState so they start
 * authenticated without repeating login per test.
 */
async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to login page
  await page.goto("http://localhost:3000/login");

  // Click the "Dev Login" button (only visible in development)
  const devLoginButton = page.getByRole("button", { name: /dev login/i });
  await devLoginButton.click();

  // Wait for redirect to the authenticated shell
  await page.waitForURL("http://localhost:3000/**", { timeout: 10_000 });

  // Save the authenticated state (cookies + localStorage)
  await context.storageState({ path: "./e2e/.auth/user.json" });

  await browser.close();
}

export default globalSetup;
