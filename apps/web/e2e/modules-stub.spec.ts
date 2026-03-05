import { test, expect } from "@playwright/test";

/**
 * Stub Module Tests
 *
 * These tests cover modules that are currently placeholders (Tasks, Calendar,
 * Documents). They verify the routes exist, the shell renders correctly around
 * them, and capture visual baselines for when real implementations land.
 *
 * As milestones 11-13 are completed, these tests should be expanded with
 * real functionality assertions.
 */

test.describe("Tasks Module (Stub)", () => {
  test("tasks route is accessible and renders within shell", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Shell should still render
    const moduleBar = page.getByRole("navigation", {
      name: /module navigation/i,
    });
    await expect(moduleBar).toBeVisible();

    // Tasks module should be active in module bar (exact match to avoid "My Tasks")
    const tasksBtn = page.getByRole("button", { name: "Tasks", exact: true });
    await expect(tasksBtn).toBeVisible();
  });

  test("tasks board route exists", async ({ page }) => {
    await page.goto("/tasks/board");
    await page.waitForLoadState("networkidle");

    // Should not 404
    const body = page.locator("body");
    await expect(body).not.toContainText("404");
  });

  test("tasks inbox route exists", async ({ page }) => {
    await page.goto("/tasks/inbox");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).not.toContainText("404");
  });

  test("tasks my-tasks route exists", async ({ page }) => {
    await page.goto("/tasks/my-tasks");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).not.toContainText("404");
  });

  test("tasks visual baseline", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("tasks-module.png", {
      fullPage: true,
    });
  });
});

test.describe("Calendar Module (Stub)", () => {
  test("calendar route is accessible and renders within shell", async ({
    page,
  }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    // Shell should still render
    const moduleBar = page.getByRole("navigation", {
      name: /module navigation/i,
    });
    await expect(moduleBar).toBeVisible();
  });

  test("calendar visual baseline", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("calendar-module.png", {
      fullPage: true,
    });
  });
});

test.describe("Documents Module (Stub)", () => {
  test("documents route is accessible and renders within shell", async ({
    page,
  }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");

    // Shell should still render
    const moduleBar = page.getByRole("navigation", {
      name: /module navigation/i,
    });
    await expect(moduleBar).toBeVisible();
  });

  test("documents visual baseline", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("documents-module.png", {
      fullPage: true,
    });
  });
});

test.describe("Admin", () => {
  test("admin route is accessible", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).not.toContainText("404");
  });

  test("admin visual baseline", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("admin-page.png", {
      fullPage: true,
    });
  });
});
