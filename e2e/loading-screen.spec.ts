import { expect, test } from '@playwright/test';

test('shows the kiosk entry screen', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();
  await expect(page.getByRole('button').first()).toBeVisible();
});
