import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // No auth for login tests

    test("shows login page for unauthenticated users", async ({ page }) => {
      await page.goto("/contracts");
      await expect(page).toHaveURL(/\/login/);
    });

    test("renders the login form with Google + Dev Login", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByText("Airlock")).toBeVisible();
      await expect(page.getByText(/enterprise data operations/i)).toBeVisible();

      // Dev login button should be visible in development
      await expect(
        page.getByRole("button", { name: /dev login/i }),
      ).toBeVisible();
    });

    test("dev login redirects to shell", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /dev login/i }).click();

      // Should redirect to the shell (contracts is the default)
      await page.waitForURL(/\/(contracts|$)/);
      await expect(page.locator("body")).not.toContainText("Login");
    });

    test("login page matches visual baseline", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("login-page.png");
    });
  });

  test.describe("Protected Routes", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("redirects /contracts to /login when unauthenticated", async ({
      page,
    }) => {
      await page.goto("/contracts");
      await expect(page).toHaveURL(/\/login\?redirect=%2Fcontracts/);
    });

    test("redirects /crm to /login when unauthenticated", async ({ page }) => {
      await page.goto("/crm");
      await expect(page).toHaveURL(/\/login/);
    });

    test("redirects /tasks to /login when unauthenticated", async ({
      page,
    }) => {
      await page.goto("/tasks");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
