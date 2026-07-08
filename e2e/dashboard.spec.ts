import { test, expect } from '@playwright/test';

test.describe('LedgerAlpha Core E2E Smoke Tests', () => {
  test('should load the dashboard and display key KPIs', async ({ page }) => {
    // Navigate to the local dashboard
    await page.goto('/dashboard');

    // Verify main page title and header
    await expect(page.locator('h2')).toContainText('Dashboard');

    // Verify that the total NAV metric card exists and contains value text
    const totalNav = page.getByTestId('total-nav');
    await expect(totalNav).toBeVisible();
    await expect(totalNav).not.toBeEmpty();

    // Verify cash drag metric exists
    const cashDrag = page.getByTestId('cash-drag');
    await expect(cashDrag).toBeVisible();
    await expect(cashDrag).not.toBeEmpty();
  });

  test('should load the holdings page and display grouped portfolios', async ({ page }) => {
    // Navigate directly to holdings
    await page.goto('/holdings');

    // Verify holdings page header
    await expect(page.locator('h2')).toContainText('Holdings');

    // Verify owner-level grouped cards are rendered
    const sections = page.getByTestId('owner-section');
    await expect(sections.first()).toBeVisible();
  });

  test('should render preview rows on pasted CSV data in imports', async ({ page }) => {
    // Navigate to imports
    await page.goto('/imports');

    // Verify header
    await expect(page.locator('h2')).toContainText('Imports');

    // Find the textarea and type mock Robinhood CSV text
    const textarea = page.getByTestId('csv-textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Trade Date,Activity Type,Symbol,Quantity,Price,Amount\n2024-01-01,Buy,AAPL,10,180.00,1800.00');

    // Click preview button and wait for the table preview rows
    const previewBtn = page.getByTestId('btn-preview');
    await previewBtn.click();

    // Verify that at least one preview row is rendered in the table
    const table = page.locator('table.table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr').first()).toContainText('BUY');
  });
});
