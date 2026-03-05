import { test as setup, expect } from "@playwright/test";

/**
 * Auth Setup: Logs in via Dev Login and saves auth state.
 *
 * This runs before all other test projects. The saved storageState
 * (cookies + localStorage) is reused by chromium and wide-desktop projects.
 */
setup("authenticate via dev login", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");
  await expect(page.getByText("Airlock")).toBeVisible();

  // Click the "Dev Login" button
  const devLoginButton = page.getByRole("button", { name: /dev login/i });
  await expect(devLoginButton).toBeVisible();
  await devLoginButton.click();

  // Wait for redirect to authenticated shell
  await page.waitForURL(/\/(contracts|$)/, { timeout: 15_000 });

  // Verify we're authenticated — module bar should be visible
  await expect(
    page.getByRole("navigation", { name: /module navigation/i }),
  ).toBeVisible({ timeout: 10_000 });

  // Save the authenticated state
  await page.context().storageState({ path: "./e2e/.auth/user.json" });
});
