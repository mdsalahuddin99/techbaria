import { test, expect } from "@playwright/test";

test.describe("Admin Login & Navigation", () => {
  test("homepage loads and redirects to login", async ({ page }) => {
    await page.goto("/");
    // Should redirect to auth page or show login form
    await expect(page).toHaveURL(/login|auth/);
  });

  test("login form is visible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });
});

test.describe("Products Page", () => {
  test("products page loads with data table", async ({ page }) => {
    // First login (assumes demo credentials work)
    await page.goto("/login");
    await page.fill('input[name="email"]', "onlinetaiba@gmail.com");
    await page.fill('input[name="password"]', "Mizan2026");
    await page.click('button[type="submit"]');

    // Navigate to products
    await page.goto("/products");
    await expect(page.locator("h1, .page-title")).toContainText(/product/i);
  });
});
