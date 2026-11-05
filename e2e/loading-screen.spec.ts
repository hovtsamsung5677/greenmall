import { expect, test } from '@playwright/test';

test('shows the localized kiosk entry screen', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Открыть карту торгового центра' })).toBeVisible();
  await page.getByRole('button', { name: 'Переключить на английский' }).click();
  await expect(page.getByText('Tap to continue')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open the mall map' })).toBeVisible();
});

test('opens the map from the keyboard', async ({ page }) => {
  await page.route('**/api/public/floors', async (route) => route.fulfill({ json: [] }));
  await page.goto('/');

  const entry = page.getByRole('button', { name: 'Открыть карту торгового центра' });
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(entry).toBeHidden();
  await expect(page.locator('#root')).toBeVisible();
});

test('opens the admin login without a stored session', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Admin' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', { name: /войти/i })).toBeVisible();
});
