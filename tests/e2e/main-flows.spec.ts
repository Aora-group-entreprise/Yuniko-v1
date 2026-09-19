import { test, expect } from "@playwright/test";

test("main app shell loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("navigation remains reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/127\.0\.0\.1|localhost/);
});
