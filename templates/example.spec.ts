import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// One spec showing the four lanes: interaction + real-state check, engine matrix (via projects),
// visual baseline, accessibility. Adapt names; keep the shape.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached(); // never trust networkidle alone (F15)
});

test('captured text survives a reload', async ({ page, context }) => {
  const editor = page.getByRole('textbox', { name: 'Capture' });
  await editor.fill('synthetic capture 001');
  await expect(page.getByTestId('save-state')).toHaveAttribute('data-save-state', 'local');
  await page.reload();
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
  await expect(page.getByRole('textbox', { name: 'Capture' })).toHaveValue('synthetic capture 001'); // the effect, not the toast
});

test('works offline and reconciles when back', async ({ page, context }) => {
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('offline');
  await page.getByRole('textbox', { name: 'Capture' }).fill('offline note');
  await context.setOffline(false);
  await expect(page.getByTestId('save-state')).toHaveAttribute('data-save-state', 'synced');
});

test('capture screen: visual baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await expect(page).toHaveScreenshot('capture.png', { mask: [page.getByTestId('timestamp')] });
});

test('capture screen: no accessibility violations', async ({ page }, testInfo) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('axe', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  expect(results.violations).toEqual([]);
});
