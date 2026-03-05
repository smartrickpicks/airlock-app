import { test, expect } from "@playwright/test";

test.describe("Contracts Module", () => {
  test.describe("Triage Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/contracts/triage");
      await page.waitForLoadState("networkidle");
    });

    test("renders the triage view", async ({ page }) => {
      // Should show some content — either real data or empty state
      const body = page.locator("main, [role='main'], [class*='orchestrate']");
      await expect(body.first()).toBeVisible();
    });

    test("triage dashboard has vault cards or empty state", async ({
      page,
    }) => {
      // Triage page always shows a "Triage Board" heading
      await expect(page.getByText("Triage Board")).toBeVisible();

      // Content: vault buttons in a grid, loading state, or empty state
      const hasVaults = await page
        .locator(".grid button")
        .first()
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText(/no contracts in triage|loading vaults/i)
        .isVisible()
        .catch(() => false);

      expect(hasVaults || hasEmptyState).toBeTruthy();
    });

    test("triage dashboard visual baseline", async ({ page }) => {
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("contracts-triage.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Contract Generator", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/contracts/generator");
      await page.waitForLoadState("networkidle");
    });

    test("renders the generator with split pane layout", async ({ page }) => {
      // Generator should have a form/config area and a preview area
      const body = page.locator("main, [role='main']");
      await expect(body.first()).toBeVisible();
    });

    test("generator has contract type selection", async ({ page }) => {
      // Look for contract type selector (dropdown, radio buttons, or tabs)
      const hasTypeSelect = await page
        .locator(
          "select, [role='listbox'], [role='radiogroup'], [class*='type']",
        )
        .first()
        .isVisible()
        .catch(() => false);
      const hasTypeText = await page
        .getByText(/contract type|template|distribution|license/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasTypeSelect || hasTypeText).toBeTruthy();
    });

    test("generator visual baseline", async ({ page }) => {
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("contracts-generator.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Review Queue", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/contracts/review-queue");
      await page.waitForLoadState("networkidle");
    });

    test("renders the review queue view", async ({ page }) => {
      const body = page.locator("main, [role='main']");
      await expect(body.first()).toBeVisible();
    });

    test("review queue shows pending items or empty state", async ({
      page,
    }) => {
      const hasItems = await page
        .locator("[class*='card'], [class*='Card'], tr, [class*='item']")
        .first()
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText(/no items|no reviews|empty|all clear/i)
        .isVisible()
        .catch(() => false);

      expect(hasItems || hasEmptyState).toBeTruthy();
    });

    test("review queue visual baseline", async ({ page }) => {
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("contracts-review-queue.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Patch Workflow", () => {
    test("patch route is accessible", async ({ page }) => {
      await page.goto("/contracts/patch");
      await page.waitForLoadState("networkidle");

      const body = page.locator("main, [role='main']");
      await expect(body.first()).toBeVisible();
    });

    test("patch editor visual baseline", async ({ page }) => {
      await page.goto("/contracts/patch");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("contracts-patch.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Navigation Flow", () => {
    test("can navigate between all contracts views", async ({ page }) => {
      // Start at contracts triage (default landing)
      await page.goto("/contracts/triage");

      // Navigate to generator via sub-panel
      await page.getByText("Generator").click();
      await expect(page).toHaveURL(/\/contracts\/generator/);

      // Navigate back to triage via sub-panel
      await page.getByText("Triage Dashboard").click();
      await expect(page).toHaveURL(/\/contracts\/triage/);

      // Click Contracts in module bar — should stay in contracts
      await page.getByRole("button", { name: "Contracts" }).click();
      await expect(page).toHaveURL(/\/contracts/);
    });
  });
});
